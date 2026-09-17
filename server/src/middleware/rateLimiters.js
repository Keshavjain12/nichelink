import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { ERROR_CODES } from '../constants/errorCodes.js';

const MINUTE = 60 * 1000;

function limiter({ windowMs, limit, message, keyByUser = false, skipSuccessfulRequests = false }) {
  return ({ enabled }) =>
    rateLimit({
      windowMs,
      limit,
      skip: () => !enabled,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skipSuccessfulRequests,
      keyGenerator: (req) =>
        keyByUser && req.user ? `user:${req.user.id}` : ipKeyGenerator(req.ip ?? 'unknown'),
      handler: (_req, res) =>
        res.status(429).json({
          success: false,
          message,
          code: ERROR_CODES.RATE_LIMITED,
          errors: [],
        }),
    });
}

/**
 * Factories are invoked once per app instance so tests can build apps with limits on or off.
 */
export const limiterFactories = {
  global: limiter({ windowMs: 15 * MINUTE, limit: 600, message: 'Too many requests, slow down.' }),
  login: limiter({
    windowMs: 15 * MINUTE,
    limit: 10,
    skipSuccessfulRequests: true,
    message: 'Too many sign-in attempts. Try again in 15 minutes.',
  }),
  register: limiter({
    windowMs: 60 * MINUTE,
    limit: 10,
    message: 'Too many accounts created. Try again later.',
  }),
  sensitive: limiter({
    windowMs: 15 * MINUTE,
    limit: 10,
    message: 'Too many attempts. Try again later.',
  }),
  refresh: limiter({ windowMs: 15 * MINUTE, limit: 120, message: 'Too many session refreshes.' }),
  write: limiter({
    windowMs: 10 * MINUTE,
    limit: 60,
    keyByUser: true,
    message: 'You are posting too quickly.',
  }),
  message: limiter({
    windowMs: MINUTE,
    limit: 40,
    keyByUser: true,
    message: 'You are sending messages too quickly.',
  }),
  upload: limiter({
    windowMs: 60 * MINUTE,
    limit: 40,
    keyByUser: true,
    message: 'Upload limit reached. Try again later.',
  }),
};

export function createRateLimiters({ enabled }) {
  return Object.fromEntries(
    Object.entries(limiterFactories).map(([name, factory]) => [name, factory({ enabled })]),
  );
}
