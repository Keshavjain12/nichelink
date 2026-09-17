import jwt from 'jsonwebtoken';
import { logger } from '../config/logger.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { roleHasPermission } from '../constants/permissions.js';
import { ACCOUNT_STATUS, ROLES } from '../constants/roles.js';
import { User } from '../models/index.js';
import { buildRequestUser } from '../services/accessService.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/tokens.js';

const AUTH_USER_FIELDS = 'name username role status subscription passwordChangedAt lastActiveAt';
const ACTIVITY_WRITE_INTERVAL_MS = 5 * 60 * 1000;
/** JWT `iat` has second precision; allow for tokens minted in the same second as a password change. */
const IAT_TOLERANCE_MS = 1000;

function extractBearerToken(req) {
  const header = req.get('authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
}

function touchLastActive(user) {
  const last = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
  if (Date.now() - last < ACTIVITY_WRITE_INTERVAL_MS) return;
  User.updateOne({ _id: user._id }, { $set: { lastActiveAt: new Date() } }).catch((error) =>
    logger.warn({ err: error }, 'Failed to update lastActiveAt'),
  );
}

/**
 * Resolves the authenticated user from an access token. Identity comes from the verified token;
 * authority (role, status, plan) always comes from the database.
 */
export async function resolveUserFromToken(token) {
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Access token expired', { code: ERROR_CODES.TOKEN_EXPIRED });
    }
    throw ApiError.unauthorized('Invalid access token');
  }

  return loadRequestUser(payload.sub, { issuedAtMs: payload.iat * 1000 });
}

/**
 * Loads the current authorization state for a user id. Long-lived socket connections call this
 * before privileged actions so plan changes and suspensions apply without reconnecting.
 */
export async function loadRequestUser(userId, { issuedAtMs } = {}) {
  const user = await User.findById(userId).select(AUTH_USER_FIELDS).lean();
  if (!user) throw ApiError.unauthorized('Invalid access token');

  if (user.status === ACCOUNT_STATUS.SUSPENDED) {
    throw ApiError.forbidden('This account has been suspended', {
      code: ERROR_CODES.ACCOUNT_SUSPENDED,
    });
  }

  if (
    issuedAtMs &&
    user.passwordChangedAt &&
    issuedAtMs + IAT_TOLERANCE_MS < user.passwordChangedAt.getTime()
  ) {
    throw ApiError.unauthorized('Session is no longer valid', { code: ERROR_CODES.TOKEN_EXPIRED });
  }

  touchLastActive(user);
  return buildRequestUser(user);
}

export async function authenticate(req, _res, next) {
  const token = extractBearerToken(req);
  if (!token) throw ApiError.unauthorized();
  req.user = await resolveUserFromToken(token);
  next();
}

/** Attaches the user when a token is present; guests continue with `req.user = null`. */
export async function optionalAuthenticate(req, _res, next) {
  const token = extractBearerToken(req);
  if (token === null) {
    req.user = null;
    return next();
  }
  if (!token) throw ApiError.unauthorized('Malformed authorization header');
  req.user = await resolveUserFromToken(token);
  return next();
}

/**
 * Requires every listed permission. When upgrading to Pro would grant access, the error carries
 * PRO_REQUIRED so the client can offer an upgrade rather than a dead end.
 */
export function requirePermission(...permissions) {
  return (req, _res, next) => {
    if (!req.user) throw ApiError.unauthorized();
    const missing = permissions.filter((permission) => !req.user.permissions.includes(permission));
    if (missing.length === 0) return next();

    const proWouldGrant = missing.every((permission) => roleHasPermission(ROLES.PRO, permission));
    if (proWouldGrant && req.user.role === ROLES.FREE) {
      throw ApiError.forbidden('Upgrade to Pro to unlock this feature', {
        code: ERROR_CODES.PRO_REQUIRED,
      });
    }
    throw ApiError.forbidden();
  };
}
