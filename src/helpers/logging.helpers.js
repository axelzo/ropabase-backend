/**
 * Funciones de logging centralizadas
 *
 * Estas funciones estandarizan el formato de logs en toda la aplicación.
 * Centralizar el logging permite cambiar el formato o el destino
 * (consola, archivo, servicio externo) en un solo lugar.
 */

import { LOG_PREFIXES } from '../constants/httpResponses.js';

/**
 * Registra una petición entrante relacionada con prendas de vestir
 *
 * @param {string} action - Descripción de la acción (ej: "obtener prendas", "crear prenda")
 * @param {string} userId - ID del usuario que hace la petición
 * @param {Object} additionalInfo - Información adicional opcional
 *
 * @example
 * logClothingRequest('obtener prendas', userId);
 * logClothingRequest('crear prenda', userId, { name: 'Camisa' });
 */
export const logClothingRequest = (action, userId, additionalInfo = null) => {
  let message = `${LOG_PREFIXES.CLOTHING} Petición para ${action} del usuario: ${userId}`;

  if (additionalInfo) {
    message += ` | Info adicional: ${JSON.stringify(additionalInfo)}`;
  }

  console.log(message);
};

/**
 * Registra una operación exitosa relacionada con prendas de vestir
 *
 * @param {string} message - Mensaje descriptivo del éxito
 * @param {number|Object} data - Datos de la operación (cantidad, objeto, etc.)
 *
 * @example
 * logClothingSuccess('Prendas encontradas', clothingItems.length);
 * logClothingSuccess('Prenda creada', newItem._id);
 */
export const logClothingSuccess = (message, data) => {
  console.log(`${LOG_PREFIXES.CLOTHING} ${message}:`, data);
};

/**
 * Registra un error relacionado con prendas de vestir
 *
 * Usa console.error para que se muestre en rojo en la mayoría de terminales
 * y se diferencie de los logs normales.
 *
 * @param {string} action - Descripción de la acción que falló
 * @param {Error} error - Objeto de error capturado
 *
 * @example
 * logClothingError('obtener prendas', error);
 */
export const logClothingError = (action, error) => {
  console.error(`${LOG_PREFIXES.CLOTHING} Error al ${action}:`, error);
};

/**
 * Registra información de autenticación
 *
 * @param {string} message - Mensaje del evento de autenticación
 * @param {string} userId - ID del usuario (opcional)
 *
 * @example
 * logAuthInfo('Usuario autenticado correctamente', userId);
 */
export const logAuthInfo = (message, userId = null) => {
  const fullMessage = userId
    ? `${LOG_PREFIXES.AUTH} ${message} - Usuario: ${userId}`
    : `${LOG_PREFIXES.AUTH} ${message}`;

  console.log(fullMessage);
};

/**
 * Registra operaciones de base de datos
 *
 * @param {string} operation - Tipo de operación (find, create, update, delete)
 * @param {string} collection - Nombre de la colección
 * @param {Object} filter - Filtro usado en la operación
 *
 * @example
 * logDatabaseOperation('find', 'ClothingItem', { owner: userId });
 */
export const logDatabaseOperation = (operation, collection, filter = {}) => {
  console.log(
    `${LOG_PREFIXES.DATABASE} ${operation.toUpperCase()} en ${collection}`,
    filter
  );
};
