import crypto from 'node:crypto';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createRateLimiters } from './middleware/rateLimiters.js';
import { sanitizeInput } from './middleware/sanitizeInput.js';
import { createApiRouter } from './routes/index.js';

export const API_PREFIX = '/api/v1';

export function createApp({ rateLimitEnabled = env.RATE_LIMIT_ENABLED } = {}) {
  const app = express();
  const limiters = createRateLimiters({ enabled: rateLimitEnabled });

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url === `${API_PREFIX}/health` },
      customLogLevel: (_req, res, error) => (error || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
    }),
  );

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => callback(null, !origin || env.corsOrigins.includes(origin)),
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
      maxAge: 600,
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  app.use(express.json({ limit: '200kb' }));
  app.use(sanitizeInput);
  app.use(API_PREFIX, limiters.global);

  app.use(API_PREFIX, createApiRouter({ limiters }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
