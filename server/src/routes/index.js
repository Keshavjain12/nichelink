import { Router } from 'express';
import { env } from '../config/env.js';
import { isDatabaseReady } from '../config/database.js';
import { PLAN_CATALOG, PLAN_LIMITS } from '../constants/plans.js';
import { sendSuccess } from '../utils/response.js';
import { createAuthRouter } from './authRoutes.js';

export function createApiRouter({ limiters }) {
  const router = Router();

  router.get('/health', (_req, res) => {
    const database = isDatabaseReady() ? 'up' : 'down';
    res.status(database === 'up' ? 200 : 503).json({
      success: database === 'up',
      data: { status: database === 'up' ? 'ok' : 'degraded', database, uptime: Math.round(process.uptime()) },
    });
  });

  router.get('/config', (_req, res) =>
    sendSuccess(res, { data: { features: env.features, plans: PLAN_CATALOG, limits: PLAN_LIMITS } }),
  );

  router.use('/auth', createAuthRouter({ limiters }));

  return router;
}
