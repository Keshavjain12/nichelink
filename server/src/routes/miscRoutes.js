import { Router } from 'express';
import * as notificationController from '../controllers/notificationController.js';
import * as searchController from '../controllers/searchController.js';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import { listNotificationsQuery, searchQuery, suggestionsQuery } from '../validators/searchValidators.js';

export function createSearchRouter() {
  const router = Router();
  router.get('/', optionalAuthenticate, validate({ query: searchQuery }), searchController.search);
  router.get('/suggestions', optionalAuthenticate, validate({ query: suggestionsQuery }), searchController.suggestions);
  return router;
}

export function createNotificationRouter() {
  const router = Router();
  router.use(authenticate);
  router.get('/', validate({ query: listNotificationsQuery }), notificationController.list);
  router.get('/unread-count', notificationController.unreadCount);
  router.patch('/read-all', notificationController.markAllRead);
  router.patch('/:id/read', validate({ params: idParams }), notificationController.markRead);
  return router;
}
