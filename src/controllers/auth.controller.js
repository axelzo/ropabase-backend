// CAMBIO 1: Importar el modelo User de Mongoose en lugar del cliente de Prisma.
import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// Importar helpers y constantes
import {
  sendSuccessResponse,
  sendErrorResponse,
  handleDatabaseError,
} from '../helpers/response.helpers.js';
import { logAuthInfo } from '../helpers/logging.helpers.js';
import { ERROR_MESSAGES, HTTP_STATUS } from '../constants/httpResponses.js';

export const register = async (req, res) => {
  logAuthInfo('Petición de registro');
  const { name, email, password } = req.body;

  if (!email || !password) {
    return sendErrorResponse(res, 'Email and password are required', HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    logAuthInfo('Password hasheado para nuevo usuario');

    // CAMBIO 2: Usar el método User.create de Mongoose para guardar el nuevo usuario.
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // Usar user._id, que es el ID por defecto en MongoDB.
    logAuthInfo('Usuario creado exitosamente', user._id);
    return sendSuccessResponse(
      res,
      { message: 'User created successfully', userId: user._id },
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    // CAMBIO 3: Manejar el error de clave duplicada de Mongoose (código 11000).
    if (error.code === 11000) {
      logAuthInfo('Intento de registro con email existente', email);
      return sendErrorResponse(res, 'Email already exists', HTTP_STATUS.CONFLICT);
    }
    return handleDatabaseError(res, error, 'registrar usuario');
  }
};

export const login = async (req, res) => {
  logAuthInfo('Petición de login');
  const { email, password } = req.body;

  if (!email || !password) {
    return sendErrorResponse(res, 'Email and password are required', HTTP_STATUS.BAD_REQUEST);
  }

  try {
    // CAMBIO 4: Usar el método findOne de Mongoose para encontrar al usuario por email.
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

    // CAMBIO 5: Firmar el token JWT con user._id.
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    logAuthInfo('Login exitoso, token generado', user._id);
    return sendSuccessResponse(res, { token });
  } catch (error) {
    return handleDatabaseError(res, error, 'hacer login');
  }
};
