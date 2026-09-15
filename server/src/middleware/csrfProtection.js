import { env } from '../config/env.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Guards endpoints that authenticate with the refresh cookie. A cross-site form cannot set custom
 * headers, and a cross-origin fetch that does must pass CORS preflight against our allowlist.
 */
export function requireTrustedOrigin(req, _res, next) {
  const origin = req.get('origin');
  if (origin && !env.corsOrigins.includes(origin)) {
    throw new ApiError(403, 'Request origin is not allowed', { code: ERROR_CODES.CSRF_REJECTED });
  }
  if (req.get('x-requested-with') !== 'XMLHttpRequest') {
    throw new ApiError(403, 'Missing anti-CSRF header', { code: ERROR_CODES.CSRF_REJECTED });
  }
  next();
}
