/**
 * Constantes para mensajes de error y códigos HTTP
 *
 * Este archivo centraliza todos los mensajes y códigos de estado HTTP
 * para evitar "magic strings" y "magic numbers" en el código.
 *
 * Beneficios:
 * - Fácil de mantener: cambiar un mensaje se hace en un solo lugar
 * - Evita typos: usar constantes previene errores de escritura
 * - Consistencia: todos los endpoints usan los mismos mensajes
 */

export const ERROR_MESSAGES = {
  INTERNAL_SERVER_ERROR: 'Internal server error',
  UNAUTHORIZED: 'User not authorized',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation error',
};

export const CLOTHING_MESSAGES = {
  NOT_FOUND: 'Clothing item not found',
  UNAUTHORIZED_UPDATE: 'User not authorized to update this item',
  UNAUTHORIZED_DELETE: 'User not authorized to delete this item',
  REQUIRED_FIELDS: 'Name, category, and color are required',
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

export const LOG_PREFIXES = {
  CLOTHING: '[CLOTHING]',
  AUTH: '[AUTH]',
  DATABASE: '[DATABASE]',
};
