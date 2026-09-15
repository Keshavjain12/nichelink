import { Router } from 'express';
import * as conversationController from '../controllers/conversationController.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { authenticate, requirePermission } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import {
  directMessageBody,
  listConversationsQuery,
  listMessagesQuery,
  sendMessageBody,
  startConversationBody,
} from '../validators/messageValidators.js';

export function createConversationRouter({ limiters }) {
  const router = Router();
  router.use(authenticate, requirePermission(PERMISSIONS.MESSAGE_SEND));

  router.get('/', validate({ query: listConversationsQuery }), conversationController.list);
  router.post('/', limiters.write, validate({ body: startConversationBody }), conversationController.start);
  router.get('/unread-count', conversationController.unreadCount);
  router.get('/quota', conversationController.quota);

  router.get('/:id', validate({ params: idParams }), conversationController.detail);
  router.get('/:id/messages', validate({ params: idParams, query: listMessagesQuery }), conversationController.messages);
  router.post(
    '/:id/messages',
    limiters.message,
    validate({ params: idParams, body: sendMessageBody }),
    conversationController.send,
  );
  router.patch('/:id/read', validate({ params: idParams }), conversationController.markRead);

  return router;
}

/** Convenience endpoint for "Message" buttons: opens (or reuses) the conversation and sends in one call. */
export function createMessageRouter({ limiters }) {
  const router = Router();
  router.post(
    '/',
    authenticate,
    requirePermission(PERMISSIONS.MESSAGE_SEND),
    limiters.message,
    validate({ body: directMessageBody }),
    conversationController.sendDirect,
  );
  return router;
}
