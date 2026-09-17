import { ZodError } from 'zod';
import { logger } from '../config/logger.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { SOCKET_EVENTS } from '../constants/socketEvents.js';
import { loadRequestUser } from '../middleware/authenticate.js';
import { User } from '../models/index.js';
import * as messageService from '../services/messageService.js';
import { ApiError } from '../utils/ApiError.js';
import {
  socketConversationRef,
  socketPresenceQuery,
  socketSendMessage,
} from '../validators/messageValidators.js';
import { addConnection, onlineSubset, removeConnection } from './presence.js';
import { conversationRoom, emitToUsers, userRoom } from './realtime.js';

const SEND_LIMIT = { max: 20, windowMs: 10_000 };
const TYPING_LIMIT = { max: 30, windowMs: 10_000 };

function createWindowLimiter({ max, windowMs }) {
  let timestamps = [];
  return () => {
    const now = Date.now();
    timestamps = timestamps.filter((time) => now - time < windowMs);
    if (timestamps.length >= max) return false;
    timestamps.push(now);
    return true;
  };
}

function toSocketError(error) {
  if (error instanceof ZodError) {
    return {
      status: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: error.issues[0]?.message ?? 'Invalid payload',
    };
  }
  if (error instanceof ApiError) {
    return {
      status: error.statusCode,
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }
  return { status: 500, code: ERROR_CODES.INTERNAL_ERROR, message: 'Something went wrong' };
}

/** Wraps an event handler with validation-friendly error handling and a uniform `{ ok, data | error }` ack. */
function withAck(socket, event, handler) {
  return async (payload, ack) => {
    const respond = typeof ack === 'function' ? ack : () => {};
    try {
      respond({ ok: true, data: await handler(payload ?? {}) });
    } catch (error) {
      const socketError = toSocketError(error);
      if (socketError.status >= 500) {
        logger.error({ err: error, event, userId: socket.data.user.id }, 'Socket handler failed');
      }
      respond({ ok: false, error: socketError });
      if (socketError.code === ERROR_CODES.ACCOUNT_SUSPENDED) socket.disconnect(true);
    }
  };
}

async function broadcastPresence(userId, online) {
  const partners = await messageService.conversationPartnerIds(userId);
  emitToUsers(partners, online ? SOCKET_EVENTS.USER_ONLINE : SOCKET_EVENTS.USER_OFFLINE, {
    userId,
    at: new Date().toISOString(),
  });
}

/**
 * Listeners are attached synchronously: a client may emit immediately after `connect`, and any
 * await before registration would silently drop those events.
 */
export function registerConnection(socket) {
  const userId = socket.data.user.id;
  const canSend = createWindowLimiter(SEND_LIMIT);
  const canSignalTyping = createWindowLimiter(TYPING_LIMIT);

  socket.join(userRoom(userId));

  // Re-read authorization for each privileged action: long-lived sockets must honour plan changes.
  const currentUser = () => loadRequestUser(userId);

  socket.on(
    SOCKET_EVENTS.JOIN_CONVERSATION,
    withAck(socket, SOCKET_EVENTS.JOIN_CONVERSATION, async (payload) => {
      const { conversationId } = socketConversationRef.parse(payload);
      await messageService.assertConversationMember(conversationId, userId);
      await socket.join(conversationRoom(conversationId));
      return { conversationId };
    }),
  );

  socket.on(
    SOCKET_EVENTS.LEAVE_CONVERSATION,
    withAck(socket, SOCKET_EVENTS.LEAVE_CONVERSATION, async (payload) => {
      const { conversationId } = socketConversationRef.parse(payload);
      await socket.leave(conversationRoom(conversationId));
      return { conversationId };
    }),
  );

  socket.on(
    SOCKET_EVENTS.SEND_MESSAGE,
    withAck(socket, SOCKET_EVENTS.SEND_MESSAGE, async (payload) => {
      if (!canSend()) throw ApiError.tooManyRequests('You are sending messages too quickly');
      const input = socketSendMessage.parse(payload);
      const { message } = await messageService.sendMessage(await currentUser(), input);
      return message;
    }),
  );

  socket.on(
    SOCKET_EVENTS.MESSAGE_READ,
    withAck(socket, SOCKET_EVENTS.MESSAGE_READ, async (payload) => {
      const { conversationId } = socketConversationRef.parse(payload);
      return messageService.markConversationRead(await currentUser(), conversationId);
    }),
  );

  socket.on(
    SOCKET_EVENTS.PRESENCE_QUERY,
    withAck(socket, SOCKET_EVENTS.PRESENCE_QUERY, async (payload) => {
      const { userIds } = socketPresenceQuery.parse(payload);
      return { online: onlineSubset(userIds) };
    }),
  );

  const relayTyping = (isTyping) => (payload) => {
    const parsed = socketConversationRef.safeParse(payload);
    if (!parsed.success || !canSignalTyping()) return;
    const room = conversationRoom(parsed.data.conversationId);
    // Only sockets that passed the membership check in join_conversation are in the room.
    if (!socket.rooms.has(room)) return;
    socket.to(room).emit(SOCKET_EVENTS.USER_TYPING, {
      conversationId: parsed.data.conversationId,
      userId,
      isTyping,
    });
  };
  socket.on(SOCKET_EVENTS.TYPING_START, relayTyping(true));
  socket.on(SOCKET_EVENTS.TYPING_STOP, relayTyping(false));

  socket.on('disconnect', () => {
    if (!removeConnection(userId)) return;
    Promise.all([
      broadcastPresence(userId, false),
      User.updateOne({ _id: userId }, { $set: { lastActiveAt: new Date() } }),
    ]).catch((error) => logger.warn({ err: error, userId }, 'Failed to record disconnect'));
  });

  if (addConnection(userId)) {
    broadcastPresence(userId, true).catch((error) =>
      logger.warn({ err: error, userId }, 'Failed to broadcast presence'),
    );
  }
}
