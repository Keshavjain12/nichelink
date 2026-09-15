import pino from 'pino';
import { env } from './env.js';

const defaultLevel = env.isTest ? 'silent' : env.isProduction ? 'info' : 'debug';

export const logger = pino({
  level: env.LOG_LEVEL ?? defaultLevel,
  base: { service: 'nichelink-api' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.currentPassword',
      '*.newPassword',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
    ],
    censor: '[redacted]',
  },
  ...(env.isDevelopment && {
    transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
  }),
});
