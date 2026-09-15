import { Router } from 'express';
import { env } from '../config/env.js';
import { isDatabaseReady } from '../config/database.js';
import { PLAN_CATALOG, PLAN_LIMITS } from '../constants/plans.js';
import { sendSuccess } from '../utils/response.js';
import { createAuthRouter } from './authRoutes.js';
import { createCommunityRouter, createMembershipRouter } from './communityRoutes.js';
import { createConversationRouter, createMessageRouter } from './conversationRoutes.js';
import { createNotificationRouter, createSearchRouter } from './miscRoutes.js';
import { createCommentRouter, createPostRouter } from './postRoutes.js';
import { createProjectRouter } from './projectRoutes.js';
import { createSubscriptionRouter } from './subscriptionRoutes.js';
import { createUploadRouter, createUserRouter } from './userRoutes.js';

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
  router.use('/users', createUserRouter({ limiters }));
  router.use('/uploads', createUploadRouter({ limiters }));
  router.use('/communities', createCommunityRouter({ limiters }));
  router.use('/memberships', createMembershipRouter());
  router.use('/posts', createPostRouter({ limiters }));
  router.use('/comments', createCommentRouter({ limiters }));
  router.use('/conversations', createConversationRouter({ limiters }));
  router.use('/messages', createMessageRouter({ limiters }));
  router.use('/projects', createProjectRouter({ limiters }));
  router.use('/subscriptions', createSubscriptionRouter({ limiters }));
  router.use('/search', createSearchRouter());
  router.use('/notifications', createNotificationRouter());

  return router;
}
