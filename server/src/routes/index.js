import { Router } from 'express';
import { isDatabaseReady } from '../config/database.js';
import * as configController from '../controllers/configController.js';
import { createAdminRouter, createReportRouter } from './adminRoutes.js';
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

  router.get('/config', configController.getConfig);

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
  router.use('/reports', createReportRouter({ limiters }));
  router.use('/admin', createAdminRouter());

  return router;
}
