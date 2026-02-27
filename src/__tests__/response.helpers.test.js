import {
  sendSuccessResponse,
  sendErrorResponse,
  handleDatabaseError,
  sendNoContentResponse,
} from '../helpers/response.helpers.js';
import { ERROR_MESSAGES, HTTP_STATUS } from '../constants/httpResponses.js';
import * as loggingHelpers from '../helpers/logging.helpers.js';

jest.mock('../helpers/logging.helpers.js');

describe('Response Helpers', () => {
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('sendSuccessResponse', () => {
    it('should send success response with default status 200', () => {
      const data = { items: ['shirt', 'pants'] };

      sendSuccessResponse(res, data);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith(data);
    });

    it('should send success response with custom status 201', () => {
      const data = { _id: 'item123', name: 'Camisa' };

      sendSuccessResponse(res, data, HTTP_STATUS.CREATED);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
      expect(res.json).toHaveBeenCalledWith(data);
    });

    it('should send success response with array data', () => {
      const data = [{ id: 1 }, { id: 2 }];

      sendSuccessResponse(res, data);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith(data);
    });
  });

  describe('sendErrorResponse', () => {
    it('should send error response with default status 500', () => {
      const message = 'Internal server error';

      sendErrorResponse(res, message);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith({ message });
    });

    it('should send error response with custom status 404', () => {
      const message = 'Item not found';

      sendErrorResponse(res, message, HTTP_STATUS.NOT_FOUND);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
      expect(res.json).toHaveBeenCalledWith({ message });
    });

    it('should send error response with status 400', () => {
      const message = 'Bad request';

      sendErrorResponse(res, message, HTTP_STATUS.BAD_REQUEST);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({ message });
    });

    it('should send error response with status 401', () => {
      const message = ERROR_MESSAGES.UNAUTHORIZED;

      sendErrorResponse(res, message, HTTP_STATUS.UNAUTHORIZED);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
      expect(res.json).toHaveBeenCalledWith({ message });
    });
  });

  describe('handleDatabaseError', () => {
    it('should handle ValidationError with 400 status', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      const action = 'crear prenda';

      handleDatabaseError(res, error, action);

      expect(loggingHelpers.logClothingError).toHaveBeenCalledWith(action, error);
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({ message: ERROR_MESSAGES.VALIDATION_ERROR });
    });

    it('should handle CastError with 404 status', () => {
      const error = new Error('Cast to ObjectId failed');
      error.name = 'CastError';
      const action = 'obtener prenda';

      handleDatabaseError(res, error, action);

      expect(loggingHelpers.logClothingError).toHaveBeenCalledWith(action, error);
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.NOT_FOUND);
      expect(res.json).toHaveBeenCalledWith({ message: ERROR_MESSAGES.NOT_FOUND });
    });

    it('should handle generic error with 500 status', () => {
      const error = new Error('Database connection failed');
      error.name = 'MongoNetworkError';
      const action = 'actualizar prenda';

      handleDatabaseError(res, error, action);

      expect(loggingHelpers.logClothingError).toHaveBeenCalledWith(action, error);
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
    });

    it('should handle unknown error with 500 status', () => {
      const error = new Error('Unknown error');
      const action = 'eliminar prenda';

      handleDatabaseError(res, error, action);

      expect(loggingHelpers.logClothingError).toHaveBeenCalledWith(action, error);
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  describe('sendNoContentResponse', () => {
    it('should send 204 No Content response', () => {
      sendNoContentResponse(res);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.NO_CONTENT);
      expect(res.send).toHaveBeenCalled();
    });

    it('should not send json data', () => {
      sendNoContentResponse(res);

      expect(res.json).not.toHaveBeenCalled();
      expect(res.send).toHaveBeenCalled();
    });

    it('should return response object', () => {
      const result = sendNoContentResponse(res);

      expect(result).toBe(res);
    });
  });
});
