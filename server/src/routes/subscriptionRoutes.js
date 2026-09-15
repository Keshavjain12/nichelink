import { Router } from 'express';
import { z } from 'zod';
import * as subscriptionController from '../controllers/subscriptionController.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

const confirmBody = z.object({
  sessionId: z.string().regex(/^cs_[A-Za-z0-9_]{8,200}$/, 'Invalid checkout session id'),
});

export function createSubscriptionRouter({ limiters }) {
  const router = Router();
  router.use(authenticate);

  router.get('/me', subscriptionController.me);
  router.post('/checkout', limiters.sensitive, subscriptionController.checkout);
  router.post('/checkout/confirm', limiters.sensitive, validate({ body: confirmBody }), subscriptionController.confirm);
  router.post('/portal', limiters.sensitive, subscriptionController.portal);
  router.post('/cancel', limiters.sensitive, subscriptionController.cancel);
  router.post('/resume', limiters.sensitive, subscriptionController.resume);

  return router;
}
