import { ERROR_CODES } from '../constants/errorCodes.js';

export class ApiError extends Error {
  constructor(statusCode, message, { code, errors, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.details = details;
  }

  static badRequest(message = 'Bad request', options = {}) {
    return new ApiError(400, message, { code: ERROR_CODES.VALIDATION_ERROR, ...options });
  }

  static unauthorized(message = 'Authentication required', options = {}) {
    return new ApiError(401, message, { code: ERROR_CODES.UNAUTHENTICATED, ...options });
  }

  static forbidden(message = 'You do not have permission to perform this action', options = {}) {
    return new ApiError(403, message, { code: ERROR_CODES.FORBIDDEN, ...options });
  }

  static notFound(message = 'Resource not found', options = {}) {
    return new ApiError(404, message, { code: ERROR_CODES.NOT_FOUND, ...options });
  }

  static conflict(message = 'Resource already exists', options = {}) {
    return new ApiError(409, message, { code: ERROR_CODES.CONFLICT, ...options });
  }

  static tooManyRequests(message = 'Too many requests, please try again later', options = {}) {
    return new ApiError(429, message, { code: ERROR_CODES.RATE_LIMITED, ...options });
  }

  static featureNotConfigured(feature) {
    return new ApiError(503, `${feature} is not configured on this server`, {
      code: ERROR_CODES.FEATURE_NOT_CONFIGURED,
    });
  }
}
