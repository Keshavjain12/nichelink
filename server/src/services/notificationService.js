import { logger } from '../config/logger.js';
import { SOCKET_EVENTS } from '../constants/socketEvents.js';
import { Notification } from '../models/index.js';
import { toNotification } from '../serializers/notificationSerializer.js';
import { USER_SUMMARY_FIELDS } from '../serializers/userSerializer.js';
import { emitToUser } from '../sockets/realtime.js';
import { ApiError } from '../utils/ApiError.js';
import { splitPage, toPageWindow } from '../utils/pagination.js';

export function getUnreadCount(userId) {
  return Notification.countDocuments({ recipient: userId, readAt: null });
}

async function pushUnreadCount(userId) {
  emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_COUNT, { unreadCount: await getUnreadCount(userId) });
}

/**
 * Creates a notification and pushes it in real time. With `coalesce`, repeated events about the same
 * entity update a single unread notification (e.g. "Priya and 3 others liked your post").
 *
 * Notifications are a side effect: a failure is logged and never fails the action that triggered it.
 */
export async function notify({ recipient, actor, coalesce = false, ...fields }) {
  if (!recipient || (actor && String(recipient) === String(actor))) return null;

  try {
    const notification =
      coalesce && fields.entityId
        ? await Notification.findOneAndUpdate(
            { recipient, type: fields.type, entityId: fields.entityId, readAt: null },
            { $set: { ...fields, actor }, $inc: { count: 1 } },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
          )
        : await Notification.create({ recipient, actor, ...fields });

    await notification.populate('actor', USER_SUMMARY_FIELDS);
    emitToUser(recipient, SOCKET_EVENTS.NOTIFICATION_NEW, toNotification(notification));
    await pushUnreadCount(recipient);
    return notification;
  } catch (error) {
    logger.error({ err: error, type: fields.type }, 'Failed to create notification');
    return null;
  }
}

export async function listNotifications(userId, { page, limit, unread }) {
  const window = toPageWindow({ page, limit });
  const filter = { recipient: userId, ...(unread && { readAt: null }) };

  const [rows, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ updatedAt: -1 })
      .skip(window.skip)
      .limit(window.fetchLimit)
      .populate('actor', USER_SUMMARY_FIELDS)
      .lean(),
    getUnreadCount(userId),
  ]);

  const { items, meta } = splitPage(rows, window);
  return { items: items.map(toNotification), meta: { ...meta, unreadCount } };
}

export async function markRead(userId, notificationId) {
  const exists = await Notification.exists({ _id: notificationId, recipient: userId });
  if (!exists) throw ApiError.notFound('Notification not found');

  await Notification.updateOne({ _id: notificationId, readAt: null }, { $set: { readAt: new Date() } });
  await pushUnreadCount(userId);
  return { unreadCount: await getUnreadCount(userId) };
}

export async function markAllRead(userId) {
  await Notification.updateMany({ recipient: userId, readAt: null }, { $set: { readAt: new Date() } });
  await pushUnreadCount(userId);
  return { unreadCount: 0 };
}

export async function markEntityRead(userId, entityId) {
  const result = await Notification.updateMany(
    { recipient: userId, entityId, readAt: null },
    { $set: { readAt: new Date() } },
  );
  if (result.modifiedCount > 0) await pushUnreadCount(userId);
}
