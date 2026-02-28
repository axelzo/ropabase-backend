import { protect } from '../middlewares/auth.middleware.js';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();

    // El middleware ahora lee el token desde req.cookies.accessToken (cookie HTTP-only)
    // en lugar de req.headers.authorization (Bearer token).
    req = {
      cookies: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();

    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe('protect middleware', () => {
    it('should call next() when a valid token is provided via cookie', () => {
      const token = 'valid.jwt.token';
      const decoded = { userId: 'user123', email: 'test@example.com' };
      req.cookies.accessToken = token;
      jwt.verify.mockReturnValue(decoded);

      protect(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(req.user).toEqual(decoded);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should return 401 when no cookie is provided', () => {
      // req.cookies.accessToken no está definido

      protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'No token provided, authorization denied',
      });
      expect(next).not.toHaveBeenCalled();
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('should return 401 when cookie is empty string', () => {
      req.cookies.accessToken = '';

      protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'No token provided, authorization denied',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', () => {
      const token = 'invalid.jwt.token';
      req.cookies.accessToken = token;
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      protect(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token is not valid' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', () => {
      const token = 'expired.jwt.token';
      req.cookies.accessToken = token;
      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => {
        throw error;
      });

      protect(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token is not valid' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is malformed', () => {
      const token = 'malformed';
      req.cookies.accessToken = token;
      const error = new Error('jwt malformed');
      error.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation(() => {
        throw error;
      });

      protect(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token is not valid' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should read token correctly from cookie and attach user to req', () => {
      const token = 'correct.token.format';
      const decoded = { userId: 'user456' };
      req.cookies.accessToken = token;
      jwt.verify.mockReturnValue(decoded);

      protect(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(req.user).toEqual(decoded);
      expect(next).toHaveBeenCalled();
    });
  });
});
