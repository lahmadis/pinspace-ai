/**
 * API Response Helper
 * 
 * Standardizes all API responses to use { data, error } format.
 * 
 * Usage:
 *   return successResponse(res, data, statusCode);
 *   return errorResponse(res, error, statusCode, details);
 */

/**
 * Send a successful API response
 * 
 * @param {Object} res - Next.js response object
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export function successResponse(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    data,
    error: null,
  });
}

/**
 * Send an error API response
 * 
 * @param {Object} res - Next.js response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} details - Optional error details
 */
export function errorResponse(res, message, statusCode = 500, details = null) {
  return res.status(statusCode).json({
    data: null,
    error: {
      message,
      ...(details && { details }),
    },
  });
}






