/**
 * Funciones para estandarizar respuestas HTTP
 *
 * Estas funciones encapsulan el manejo de respuestas exitosas y errores,
 * garantizando un formato consistente en toda la API.
 */

import { ERROR_MESSAGES, HTTP_STATUS } from '../constants/httpResponses.js';
import { logClothingError } from './logging.helpers.js';

/**
 * Envía una respuesta exitosa al cliente
 *
 * @param {Object} res - Objeto de respuesta de Express
 * @param {*} data - Datos a enviar (objeto, array, string, etc.)
 * @param {number} status - Código de estado HTTP (default: 200)
 *
 * @example
 * sendSuccessResponse(res, clothingItems);
 * sendSuccessResponse(res, newItem, HTTP_STATUS.CREATED);
 */
export const sendSuccessResponse = (res, data, status = HTTP_STATUS.OK) => {
  return res.status(status).json(data);
};

/**
 * Envía una respuesta de error al cliente
 *
 * @param {Object} res - Objeto de respuesta de Express
 * @param {string} message - Mensaje de error
 * @param {number} status - Código de estado HTTP (default: 500)
 *
 * @example
 * sendErrorResponse(res, 'Item not found', HTTP_STATUS.NOT_FOUND);
 * sendErrorResponse(res, ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
 */
export const sendErrorResponse = (res, message, status = HTTP_STATUS.INTERNAL_SERVER_ERROR) => {
  return res.status(status).json({ message });
};

/**
 * Maneja errores de base de datos de manera inteligente
 *
 * Esta función analiza el tipo de error de Mongoose y devuelve
 * el código de estado HTTP apropiado:
 * - ValidationError → 400 Bad Request
 * - CastError (ID inválido) → 404 Not Found
 * - Otros errores → 500 Internal Server Error
 *
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Error} error - Error capturado en el bloque catch
 * @param {string} action - Descripción de la acción que falló (para logging)
 *
 * @example
 * try {
 *   const items = await ClothingItem.find({ owner: userId });
 *   return sendSuccessResponse(res, items);
 * } catch (error) {
 *   return handleDatabaseError(res, error, 'obtener prendas');
 * }
 */
export const handleDatabaseError = (res, error, action) => {
  // Loggear el error para debugging
  logClothingError(action, error);

  // ValidationError: datos inválidos (ej: campo requerido faltante)
  if (error.name === 'ValidationError') {
    return sendErrorResponse(
      res,
      ERROR_MESSAGES.VALIDATION_ERROR,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // CastError: ID de MongoDB inválido (formato incorrecto)
  if (error.name === 'CastError') {
    return sendErrorResponse(
      res,
      ERROR_MESSAGES.NOT_FOUND,
      HTTP_STATUS.NOT_FOUND
    );
  }

  // Cualquier otro error → 500 Internal Server Error
  return sendErrorResponse(
    res,
    ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  );
};

/**
 * Envía una respuesta vacía con código 204 No Content
 *
 * Útil para operaciones DELETE exitosas.
 *
 * @param {Object} res - Objeto de respuesta de Express
 *
 * @example
 * await ClothingItem.findByIdAndDelete(id);
 * return sendNoContentResponse(res);
 */
export const sendNoContentResponse = (res) => {
  return res.status(HTTP_STATUS.NO_CONTENT).send();
};
