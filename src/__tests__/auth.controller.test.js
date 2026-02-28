import crypto from 'crypto';
import { register, login, refresh, logout } from '../controllers/auth.controller.js';
import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('../models/user.model.js');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

// NO mockeamos crypto porque Mongoose lo usa internamente.
// En su lugar, calculamos el hash real con SHA-256 para usarlo en los mocks de DB.
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

describe('Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {},
      cookies: {},
    };

    // El mock de res incluye cookie y clearCookie porque el nuevo flujo
    // usa cookies HTTP-only en lugar de retornar tokens en el body.
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
  });

  // -------------------------------------------------------------------------
  // register
  // -------------------------------------------------------------------------
  describe('register', () => {
    it('should create a user successfully', async () => {
      req.body = { name: 'test', email: 'test@example.com', password: 'password123' };
      bcrypt.hash.mockResolvedValue('hashedPassword');
      User.create.mockResolvedValue({ _id: 'mockUserId', ...req.body });

      await register(req, res);

      expect(User.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User created successfully',
        userId: 'mockUserId',
      });
    });

    it('should return 409 if email already exists', async () => {
      req.body = { email: 'test@example.com', password: 'password123' };
      User.create.mockRejectedValue({ code: 11000 });

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email already exists' });
    });

    it('should return 500 on database error', async () => {
      req.body = { email: 'test@example.com', password: 'password123' };
      const dbError = new Error('Database connection failed');
      dbError.name = 'MongoNetworkError';
      User.create.mockRejectedValue(dbError);

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
    });

    it('should return 400 if email and password are not provided', async () => {
      req.body = { name: 'test' };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email and password are required' });
    });

    it('should return 400 if email is missing', async () => {
      req.body = { password: 'password123', name: 'test' };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email and password are required' });
    });

    it('should return 400 if password is missing', async () => {
      req.body = { email: 'test@example.com', name: 'test' };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email and password are required' });
    });
  });

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------
  describe('login', () => {
    it('should login and set access + refresh cookies HTTP-only', async () => {
      req.body = { email: 'test@example.com', password: 'password123' };
      const user = { _id: 'mockUserId', email: 'test@example.com', password: 'hashedPassword' };

      User.findOne.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      // jwt.sign se llama 2 veces: access token (15min) y refresh token (7d)
      jwt.sign
        .mockReturnValueOnce('fakeAccessToken')
        .mockReturnValueOnce('fakeRefreshToken');
      User.findByIdAndUpdate.mockResolvedValue({});

      await login(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: req.body.email });
      expect(bcrypt.compare).toHaveBeenCalledWith(req.body.password, user.password);
      // El hash SHA-256 del refresh token se guarda en DB (no el token en texto plano)
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'mockUserId',
        { refreshToken: expect.any(String) }
      );
      // Las dos cookies se emiten con httpOnly: true
      expect(res.cookie).toHaveBeenCalledWith(
        'accessToken',
        'fakeAccessToken',
        expect.objectContaining({ httpOnly: true })
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'fakeRefreshToken',
        expect.objectContaining({ httpOnly: true })
      );
      // Los tokens NO van en el body → no expuestos a localStorage/XSS
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Login successful', userId: 'mockUserId' })
      );
    });

    it('should return 401 if user is not found', async () => {
      req.body = { email: 'notfound@example.com', password: 'password123' };
      User.findOne.mockResolvedValue(null);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('should return 401 if password is incorrect', async () => {
      req.body = { email: 'test@example.com', password: 'wrongpassword' };
      const user = { _id: 'mockUserId', email: 'test@example.com', password: 'hashedPassword' };
      User.findOne.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(false);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('should return 400 if password is missing', async () => {
      req.body = { email: 'test@example.com' };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email and password are required' });
    });

    it('should return 400 if email is missing', async () => {
      req.body = { password: 'password123' };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if both fields are missing', async () => {
      req.body = {};

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on database error', async () => {
      req.body = { email: 'test@example.com', password: 'password123' };
      const dbError = new Error('Database timeout');
      dbError.name = 'MongoTimeoutError';
      User.findOne.mockRejectedValue(dbError);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // -------------------------------------------------------------------------
  // refresh
  // -------------------------------------------------------------------------
  describe('refresh', () => {
    it('should return 401 if no refresh token cookie is provided', async () => {
      // req.cookies.refreshToken no definido

      await refresh(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'No refresh token provided' });
    });

    it('should return 401 if jwt.verify throws (token expirado o manipulado)', async () => {
      req.cookies.refreshToken = 'expiredToken';
      jwt.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await refresh(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid refresh token' });
    });

    it('should return 401 if user is not found in DB', async () => {
      req.cookies.refreshToken = 'validRefreshToken';
      jwt.verify.mockReturnValue({ userId: 'mockUserId' });
      User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

      await refresh(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid refresh token' });
    });

    it('should return 401 if stored hash does not match (token revocado)', async () => {
      req.cookies.refreshToken = 'validRefreshToken';
      jwt.verify.mockReturnValue({ userId: 'mockUserId' });
      // El hash almacenado es diferente → token revocado (logout previo)
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'mockUserId',
          refreshToken: 'differentStoredHash_thatWillNotMatch',
        }),
      });

      await refresh(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid refresh token' });
    });

    it('should issue a new access token cookie when both barriers pass', async () => {
      const tokenValue = 'validRefreshToken';
      req.cookies.refreshToken = tokenValue;
      jwt.verify.mockReturnValue({ userId: 'mockUserId' });
      // El hash almacenado DEBE coincidir con SHA-256('validRefreshToken')
      const correctHash = hashToken(tokenValue);
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'mockUserId',
          refreshToken: correctHash,
        }),
      });
      jwt.sign.mockReturnValue('newAccessToken');

      await refresh(req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'accessToken',
        'newAccessToken',
        expect.objectContaining({ httpOnly: true })
      );
      expect(res.json).toHaveBeenCalledWith({ message: 'Token refreshed successfully' });
    });
  });

  // -------------------------------------------------------------------------
  // logout
  // -------------------------------------------------------------------------
  describe('logout', () => {
    it('should clear cookies and invalidate token in DB', async () => {
      const tokenValue = 'validRefreshToken';
      req.cookies.refreshToken = tokenValue;
      User.findOneAndUpdate.mockResolvedValue({});

      await logout(req, res);

      // Se busca en DB por el hash SHA-256 del token recibido
      expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        { refreshToken: hashToken(tokenValue) },
        { $unset: { refreshToken: 1 } }
      );
      expect(res.clearCookie).toHaveBeenCalledWith('accessToken', expect.any(Object));
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });

    it('should clear cookies even without refresh token cookie (logout graceful)', async () => {
      // req.cookies.refreshToken no definido → no se consulta la DB

      await logout(req, res);

      expect(User.findOneAndUpdate).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith('accessToken', expect.any(Object));
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });

    it('should still clear cookies if DB update fails (graceful degradation)', async () => {
      req.cookies.refreshToken = 'validRefreshToken';
      User.findOneAndUpdate.mockRejectedValue(new Error('DB error'));

      await logout(req, res);

      // Aunque la DB falló, las cookies se borran para proteger al usuario
      expect(res.clearCookie).toHaveBeenCalledWith('accessToken', expect.any(Object));
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });
  });
});
