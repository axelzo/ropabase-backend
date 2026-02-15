/**
 * Funciones de validación reutilizables
 *
 * Estas funciones encapsulan lógica de validación común para evitar
 * repetir código en los controladores.
 *
 * Cada función retorna null si la validación pasa, o un objeto de error
 * con el formato { message: string, status: number } si falla.
 */

import { ERROR_MESSAGES, HTTP_STATUS } from '../constants/httpResponses.js';

/**
 * Valida que el usuario esté autenticado
 *
 * Esta función verifica que el middleware de autenticación haya
 * agregado el objeto req.user correctamente.
 *
 * @param {Object} req - Objeto de petición de Express
 * @returns {Object|null} Objeto de error si falla, null si pasa
 *
 * @example
 * const authError = validateUserAuthentication(req);
 * if (authError) {
 *   return sendErrorResponse(res, authError.message, authError.status);
 * }
 */
export const validateUserAuthentication = (req) => {
  // Verifica que req.user exista (el middleware lo agrega)
  if (!req.user) {
    return {
      message: ERROR_MESSAGES.UNAUTHORIZED,
      status: HTTP_STATUS.UNAUTHORIZED,
    };
  }

  // Verifica que req.user tenga el campo userId
  if (!req.user.userId) {
    return {
      message: ERROR_MESSAGES.UNAUTHORIZED,
      status: HTTP_STATUS.UNAUTHORIZED,
    };
  }

  // Validación exitosa
  return null;
};

/**
 * Extrae el userId de manera segura del objeto request
 *
 * Esta función asume que validateUserAuthentication ya se ejecutó
 * y pasó correctamente.
 *
 * @param {Object} req - Objeto de petición de Express
 * @returns {string} El ID del usuario autenticado
 *
 * @example
 * const userId = extractUserId(req);
 * const items = await ClothingItem.find({ owner: userId });
 */
export const extractUserId = (req) => {
  return req.user.userId;
};

/**
 * Verifica si un valor es un array válido (no vacío ni null)
 *
 * @param {*} items - Valor a verificar
 * @returns {boolean} true si es un array válido, false en caso contrario
 *
 * @example
 * const items = await ClothingItem.find({ owner: userId });
 * if (!isValidArray(items)) {
 *   return sendSuccessResponse(res, []);
 * }
 */
export const isValidArray = (items) => {
  return Array.isArray(items) && items.length > 0;
};

/**
 * Valida que los campos requeridos de una prenda existan
 *
 * @param {Object} body - Body de la petición HTTP
 * @returns {Object|null} Objeto de error si falla, null si pasa
 *
 * @example
 * const validationError = validateClothingItemFields(req.body);
 * if (validationError) {
 *   return sendErrorResponse(res, validationError.message, validationError.status);
 * }
 */
export const validateClothingItemFields = (body) => {
  const { name, category, color } = body;

  if (!name || !category || !color) {
    return {
      message: 'Name, category, and color are required',
      status: HTTP_STATUS.BAD_REQUEST,
    };
  }

  return null;
};
