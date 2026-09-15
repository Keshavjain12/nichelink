import { toUserSummary } from './userSerializer.js';

export function toNotification(notification) {
  return {
    id: String(notification._id),
    type: notification.type,
    title: notification.title,
    body: notification.body ?? '',
    link: notification.link ?? '',
    count: notification.count ?? 1,
    isRead: Boolean(notification.readAt),
    actor: toUserSummary(notification.actor),
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };
}
