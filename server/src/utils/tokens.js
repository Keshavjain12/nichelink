import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const JWT_OPTIONS = Object.freeze({
  issuer: 'nichelink-api',
  audience: 'nichelink-client',
});

export function signAccessToken(userId) {
  return jwt.sign({ sub: String(userId), typ: 'access' }, env.JWT_ACCESS_SECRET, {
    ...JWT_OPTIONS,
    algorithm: 'HS256',
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

/** Throws jsonwebtoken errors (TokenExpiredError / JsonWebTokenError) on invalid tokens. */
export function verifyAccessToken(token) {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { ...JWT_OPTIONS, algorithms: ['HS256'] });
  if (payload.typ !== 'access' || typeof payload.sub !== 'string') {
    throw new jwt.JsonWebTokenError('Unexpected token type');
  }
  return payload;
}

export function generateOpaqueToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
