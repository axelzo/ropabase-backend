import {
  logClothingRequest,
  logClothingSuccess,
  logClothingError,
  logAuthInfo,
  logDatabaseOperation,
} from '../helpers/logging.helpers.js';

describe('Logging Helpers', () => {
  let consoleLogSpy, consoleErrorSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('logClothingRequest', () => {
    it('should log clothing request without additional info', () => {
      const action = 'obtener prendas';
      const userId = 'user123';

      logClothingRequest(action, userId);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Petición para ${action} del usuario: ${userId}`)
      );
    });

    it('should log clothing request with additional info', () => {
      const action = 'crear prenda';
      const userId = 'user456';
      const additionalInfo = { name: 'Camisa', color: 'Azul' };

      logClothingRequest(action, userId, additionalInfo);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Petición para ${action}`)
      );
    });

    it('should log clothing request with null additional info', () => {
      const action = 'actualizar prenda';
      const userId = 'user789';

      logClothingRequest(action, userId, null);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Petición para ${action}`)
      );
    });
  });

  describe('logClothingSuccess', () => {
    it('should log success message with numeric data', () => {
      const message = 'Prendas encontradas';
      const data = 5;

      logClothingSuccess(message, data);

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log success message with object data', () => {
      const message = 'Prenda creada';
      const data = { _id: 'item123', name: 'Camisa' };

      logClothingSuccess(message, data);

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('logClothingError', () => {
    it('should log error with Error object', () => {
      const action = 'obtener prendas';
      const error = new Error('Database error');

      logClothingError(action, error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Error al ${action}`),
        error
      );
    });

    it('should log error during creation', () => {
      const action = 'crear prenda';
      const error = new Error('Validation failed');

      logClothingError(action, error);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('logAuthInfo', () => {
    it('should log auth info with userId', () => {
      const message = 'Usuario autenticado';
      const userId = 'user123';

      logAuthInfo(message, userId);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(message)
      );
    });

    it('should log auth info without userId', () => {
      const message = 'Petición de login';

      logAuthInfo(message);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(message)
      );
    });

    it('should log auth info with null userId', () => {
      const message = 'Token verificado';

      logAuthInfo(message, null);

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('logDatabaseOperation', () => {
    it('should log database operation with filter', () => {
      const operation = 'find';
      const collection = 'ClothingItem';
      const filter = { owner: 'user123' };

      logDatabaseOperation(operation, collection, filter);

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log database operation without filter', () => {
      const operation = 'create';
      const collection = 'User';

      logDatabaseOperation(operation, collection);

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log database operation with empty filter', () => {
      const operation = 'delete';
      const collection = 'ClothingItem';
      const filter = {};

      logDatabaseOperation(operation, collection, filter);

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });
});
