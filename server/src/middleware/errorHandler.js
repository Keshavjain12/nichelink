import mongoose from 'mongoose';
import multer from 'multer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { ApiError } from '../utils/ApiError.js';

function normalizeError(error) {
  if (error instanceof ApiError) return error;

  if (error instanceof mongoose.Error.ValidationError) {
    return ApiError.badRequest('Validation failed', {
      errors: Object.values(error.errors).map((issue) => ({
        field: issue.path,
        message: issue.message,
      })),
    });
  }

  if (error instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid value for ${error.path}`);
  }

  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern ?? error.keyValue ?? {})[0];
    return ApiError.conflict(field ? `That ${field} is already in use` : 'Resource already exists', {
      errors: field ? [{ field, message: `${field} is already in use` }] : undefined,
    });
  }

  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    return new ApiError(tooLarge ? 413 : 400, tooLarge ? 'File is too large' : error.message, {
      code: tooLarge ? ERROR_CODES.PAYLOAD_TOO_LARGE : ERROR_CODES.UPLOAD_ERROR,
    });
  }

  if (error?.type === 'entity.parse.failed') {
    return ApiError.badRequest('Malformed JSON body');
  }

  if (error?.type === 'entity.too.large') {
    return new ApiError(413, 'Request body is too large', { code: ERROR_CODES.PAYLOAD_TOO_LARGE });
  }

  if (typeof error?.type === 'string' && error.type.startsWith('Stripe')) {
    return new ApiError(502, 'The payment provider rejected the request', {
      code: ERROR_CODES.PAYMENT_PROVIDER_ERROR,
    });
  }

  return null;
}

// Express identifies error middleware by arity, so `next` must stay in the signature.
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  const known = normalizeError(error);
  const apiError =
    known ?? new ApiError(500, 'Something went wrong on our side', { code: ERROR_CODES.INTERNAL_ERROR });

  const log = req.log ?? logger;
  if (apiError.statusCode >= 500) {
    log.error({ err: error, code: apiError.code }, 'Request failed');
  } else if (known && !(error instanceof ApiError)) {
    log.warn({ err: error, code: apiError.code }, 'Request rejected');
  }

  res.status(apiError.statusCode).json({
    success: false,
    message: apiError.message,
    code: apiError.code,
    errors: apiError.errors ?? [],
    ...(apiError.details && { details: apiError.details }),
    ...(!env.isProduction && apiError.statusCode >= 500 && { stack: error?.stack }),
  });
}

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist`));
}
