import crypto from 'crypto';
import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  sendSuccessResponse,
  sendErrorResponse,
  handleDatabaseError,
} from '../helpers/response.helpers.js';
import { logAuthInfo } from '../helpers/logging.helpers.js';
import { HTTP_STATUS } from '../constants/httpResponses.js';

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

/**
 * Hashea un token con SHA-256.
 * ¿Por qué SHA-256 y no bcrypt?
 * bcrypt tiene límite de 72 bytes → los JWT lo superan → colisiones silenciosas.
 * SHA-256 no tiene ese límite y es seguro para tokens de alta entropía.
 */
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

/**
 * Opciones base para cookies HTTP-only.
 * httpOnly: true  → JS del navegador NO puede leer la cookie → protección XSS.
 * secure: true    → Solo por HTTPS en producción → protección contra sniffing.
 * sameSite: 'lax' → Bloquea CSRF, compatible con proxy de Next.js.
 */
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
};

/**
 * Establece ambas cookies de autenticación.
 * Error común junior: poner tokens en body/localStorage → expuestos a XSS.
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000,           // 15 minutos
  });
  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
  });
};

// @desc    Registrar nuevo usuario
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  logAuthInfo('Petición de registro');
  const { name, email, password } = req.body;

  if (!email || !password) {
    return sendErrorResponse(res, 'Email and password are required', HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    logAuthInfo('Password hasheado para nuevo usuario');

    const user = await User.create({ name, email, password: hashedPassword });

    logAuthInfo('Usuario creado exitosamente', user._id);
    return sendSuccessResponse(
      res,
      { message: 'User created successfully', userId: user._id },
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    if (error.code === 11000) {
      logAuthInfo('Intento de registro con email existente', email);
      return sendErrorResponse(res, 'Email already exists', HTTP_STATUS.CONFLICT);
    }
    return handleDatabaseError(res, error, 'registrar usuario');
  }
};

// @desc    Login — emite access token (15min) + refresh token (7d) en cookies HTTP-only
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  logAuthInfo('Petición de login');
  const { email, password } = req.body;

  if (!email || !password) {
    return sendErrorResponse(res, 'Email and password are required', HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      logAuthInfo('Usuario no encontrado', email);
      return sendErrorResponse(res, 'Invalid credentials', HTTP_STATUS.UNAUTHORIZED);
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      logAuthInfo('Password incorrecto', email);
      return sendErrorResponse(res, 'Invalid credentials', HTTP_STATUS.UNAUTHORIZED);
    }

    // Access token: payload mínimo (solo userId), vida corta (15min).
    // NUNCA incluir datos sensibles: el payload JWT es solo base64, no está cifrado.
    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Refresh token con SECRET DIFERENTE → si uno se compromete, el otro sigue seguro.
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Guardar el HASH del refresh token en DB, nunca en texto plano.
    // Si la DB se compromete, el atacante no obtiene tokens válidos.
    const hashedRefreshToken = hashToken(refreshToken);
    await User.findByIdAndUpdate(user._id, { refreshToken: hashedRefreshToken });

    setAuthCookies(res, accessToken, refreshToken);

    logAuthInfo('Login exitoso, cookies emitidas', user._id);
    return sendSuccessResponse(res, { message: 'Login successful', userId: user._id });
  } catch (error) {
    return handleDatabaseError(res, error, 'hacer login');
  }
};

// @desc    Renovar access token usando el refresh token de la cookie
// @route   POST /api/auth/refresh
// @access  Public (requiere cookie refreshToken)
export const refresh = async (req, res) => {
  logAuthInfo('Petición de refresh token');
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return sendErrorResponse(res, 'No refresh token provided', HTTP_STATUS.UNAUTHORIZED);
  }

  try {
    // BARRERA 1: Verificar firma JWT y expiración del refresh token.
    // Si el token fue manipulado o expiró, jwt.verify lanza → capturado en catch.
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // BARRERA 2: Verificar que el token no fue revocado (ej: usuario hizo logout).
    // Hasheamos el token recibido y comparamos contra el hash en DB.
    // Error común junior: verificar solo la firma → el logout no invalida sesiones.
    const hashedToken = hashToken(refreshToken);
    const user = await User.findById(decoded.userId).select('+refreshToken');

    if (!user || user.refreshToken !== hashedToken) {
      logAuthInfo('Refresh token inválido o revocado', decoded.userId);
      return sendErrorResponse(res, 'Invalid refresh token', HTTP_STATUS.UNAUTHORIZED);
    }

    const newAccessToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.cookie('accessToken', newAccessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });

    logAuthInfo('Access token renovado exitosamente', user._id);
    return sendSuccessResponse(res, { message: 'Token refreshed successfully' });
  } catch (error) {
    // jwt.verify falla si el token está expirado o tiene firma inválida.
    return sendErrorResponse(res, 'Invalid refresh token', HTTP_STATUS.UNAUTHORIZED);
  }
};

// @desc    Cerrar sesión — invalida el refresh token en DB y borra las cookies
// @route   POST /api/auth/logout
// @access  Public
export const logout = async (req, res) => {
  logAuthInfo('Petición de logout');
  const { refreshToken } = req.cookies;

  if (refreshToken) {
    try {
      // Invalida el token en DB para que un atacante con la cookie
      // (ej: dispositivo robado) no pueda renovar la sesión.
      const hashedToken = hashToken(refreshToken);
      await User.findOneAndUpdate(
        { refreshToken: hashedToken },
        { $unset: { refreshToken: 1 } }
      );
    } catch (error) {
      // Si la DB falla, continuamos (graceful degradation).
      // Logout parcial > no poder cerrar sesión.
      logAuthInfo('Error al invalidar refresh token en DB, continuando logout');
    }
  }

  res.clearCookie('accessToken', COOKIE_OPTIONS);
  res.clearCookie('refreshToken', COOKIE_OPTIONS);

  logAuthInfo('Logout exitoso');
  return sendSuccessResponse(res, { message: 'Logged out successfully' });
};
