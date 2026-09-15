import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { ACCOUNT_STATUS } from '../constants/roles.js';
import { RefreshToken, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { generateOpaqueToken, hashToken, signAccessToken } from '../utils/tokens.js';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Concurrent tabs may present the same refresh token a moment after it was rotated. */
const ROTATION_GRACE_MS = 20 * 1000;

// Compared against when the email is unknown so response timing does not reveal registered accounts.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('nichelink-timing-equalizer', 10);

const invalidCredentials = () =>
  new ApiError(401, 'Invalid email or password', { code: ERROR_CODES.INVALID_CREDENTIALS });

const suspendedAccount = () =>
  new ApiError(403, 'This account has been suspended. Contact support if you believe this is a mistake.', {
    code: ERROR_CODES.ACCOUNT_SUSPENDED,
  });

async function createRefreshToken(userId, { family, userAgent, ip }) {
  const token = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS);
  await RefreshToken.create({
    user: userId,
    tokenHash: hashToken(token),
    family: family ?? generateOpaqueToken(16),
    expiresAt,
    userAgent: userAgent?.slice(0, 300),
    ip,
  });
  return { token, expiresAt };
}

async function issueSession(user, meta, family) {
  const refresh = await createRefreshToken(user._id, { ...meta, family });
  return { user, accessToken: signAccessToken(user._id), refresh };
}

export async function register({ name, username, email, password }, meta) {
  const existing = await User.findOne({ $or: [{ email }, { username }] })
    .select('email username')
    .lean();
  if (existing) {
    const field = existing.email === email ? 'email' : 'username';
    throw ApiError.conflict(
      field === 'email' ? 'An account with this email already exists' : 'That username is taken',
      { errors: [{ field, message: field === 'email' ? 'Email already registered' : 'Username is taken' }] },
    );
  }

  const user = await User.create({ name, username, email, password });
  logger.info({ userId: String(user._id) }, 'User registered');
  return issueSession(user, meta);
}

export async function login({ email, password }, meta) {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    throw invalidCredentials();
  }

  const matches = await user.comparePassword(password);
  if (!matches) {
    logger.info({ userId: String(user._id) }, 'Failed sign-in attempt');
    throw invalidCredentials();
  }
  if (user.status === ACCOUNT_STATUS.SUSPENDED) throw suspendedAccount();

  user.lastActiveAt = new Date();
  await user.save();
  logger.info({ userId: String(user._id) }, 'User signed in');
  return issueSession(user, meta);
}

async function revokeFamily(family, reason) {
  await RefreshToken.updateMany(
    { family, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } },
  );
}

/**
 * Rotates a refresh token. Returns `refresh: null` when a just-rotated token is replayed within the
 * grace window — the caller then keeps the cookie the browser already received.
 */
export async function refreshSession(rawToken, meta) {
  if (!rawToken) throw ApiError.unauthorized('No active session');
  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const claimed = await RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { revokedAt: now, revokedReason: 'rotated' } },
    { returnDocument: 'before' },
  ).lean();

  let tokenRecord = claimed;
  let rotate = true;

  if (!claimed) {
    const existing = await RefreshToken.findOne({ tokenHash }).lean();
    const withinGrace =
      existing?.revokedReason === 'rotated' &&
      existing.expiresAt > now &&
      now.getTime() - existing.revokedAt.getTime() < ROTATION_GRACE_MS;

    if (!withinGrace) {
      if (existing?.revokedReason === 'rotated') {
        await revokeFamily(existing.family, 'reuse-detected');
        logger.warn({ userId: String(existing.user) }, 'Refresh token reuse detected; session family revoked');
      }
      throw ApiError.unauthorized('Session expired, please sign in again');
    }
    tokenRecord = existing;
    rotate = false;
  }

  const user = await User.findById(tokenRecord.user);
  if (!user) throw ApiError.unauthorized('Session expired, please sign in again');
  if (user.status === ACCOUNT_STATUS.SUSPENDED) {
    await revokeFamily(tokenRecord.family, 'suspended');
    throw suspendedAccount();
  }

  if (!rotate) {
    return { user, accessToken: signAccessToken(user._id), refresh: null };
  }
  return issueSession(user, meta, tokenRecord.family);
}

export async function logout(rawToken) {
  if (!rawToken) return;
  const record = await RefreshToken.findOne({ tokenHash: hashToken(rawToken) }).select('family').lean();
  if (record) await revokeFamily(record.family, 'logout');
}

export async function revokeAllSessions(userId, reason) {
  await RefreshToken.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } },
  );
}

export async function changePassword(userId, { currentPassword, newPassword }, meta) {
  const user = await User.findById(userId).select('+password');
  if (!user) throw ApiError.unauthorized();

  const matches = await user.comparePassword(currentPassword);
  if (!matches) {
    throw ApiError.badRequest('Current password is incorrect', {
      errors: [{ field: 'currentPassword', message: 'Current password is incorrect' }],
    });
  }

  user.password = newPassword;
  await user.save();
  await revokeAllSessions(user._id, 'password-change');
  logger.info({ userId: String(user._id) }, 'Password changed; all sessions revoked');
  return issueSession(user, meta);
}
