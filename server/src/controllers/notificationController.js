import * as notificationService from '../services/notificationService.js';
import { sendSuccess } from '../utils/response.js';

export async function list(req, res) {
  const { items, meta } = await notificationService.listNotifications(req.user.id, req.query);
  sendSuccess(res, { data: items, meta });
}

export async function unreadCount(req, res) {
  sendSuccess(res, {
    data: { unreadCount: await notificationService.getUnreadCount(req.user.id) },
  });
}

export async function markRead(req, res) {
  sendSuccess(res, { data: await notificationService.markRead(req.user.id, req.params.id) });
}

export async function markAllRead(req, res) {
  sendSuccess(res, { data: await notificationService.markAllRead(req.user.id) });
}
