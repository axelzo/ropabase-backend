import { protect } from '../middlewares/auth.middleware.js';
import jwt from 'jsonwebtoken';

// Mock jwt module
jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock request object
    req = {
      headers: {},
    };

    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Mock next function
    next = jest.fn();

    // Mock console.log to avoid cluttering test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.log
    console.log.mockRestore();
  });

  describe('protect middleware', () => {
    it('should call next() when a valid token is provided', () => {
      // Arrange
      const token = 'valid.jwt.token';
      const decoded = { userId: 'user123', email: 'test@example.com' };
      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockReturnValue(decoded);

      // Act
      protect(req, res, next);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(req.user).toEqual(decoded);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should return 401 when no token is provided', () => {
      // Arrange - no authorization header

      // Act
      protect(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'No token provided, authorization denied'
      });
      expect(next).not.toHaveBeenCalled();
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header is missing Bearer token', () => {
      // Arrange
      req.headers.authorization = 'InvalidFormat';

      // Act
      protect(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'No token provided, authorization denied'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', () => {
      // Arrange
      const token = 'invalid.jwt.token';
      req.headers.authorization = `Bearer ${token}`;
      const error = new Error('Invalid token');
      jwt.verify.mockImplementation(() => {
        throw error;
      });

      // Act
      protect(req, res, next);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token is not valid' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', () => {
      // Arrange
      const token = 'expired.jwt.token';
      req.headers.authorization = `Bearer ${token}`;
      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => {
        throw error;
      });

      // Act
      protect(req, res, next);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token is not valid' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is malformed', () => {
      // Arrange
      const token = 'malformed';
      req.headers.authorization = `Bearer ${token}`;
      const error = new Error('jwt malformed');
      error.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation(() => {
        throw error;
      });

      // Act
      protect(req, res, next);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token is not valid' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should extract token correctly from Bearer format', () => {
      // Arrange
      const token = 'correct.token.format';
      const decoded = { userId: 'user456' };
      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockReturnValue(decoded);

      // Act
      protect(req, res, next);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(req.user).toEqual(decoded);
      expect(next).toHaveBeenCalled();
    });
  });
});
