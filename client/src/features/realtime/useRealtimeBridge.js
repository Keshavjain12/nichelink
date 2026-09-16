import { useEffect } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { toast } from 'sonner';
import { api } from '../../app/api';
import { SOCKET_EVENTS } from '../../constants/app';
import { refreshSession } from '../../services/session';
import { connectSocket, disconnectSocket } from '../../services/socket';
import { sessionEnded, sessionStarted } from '../auth/authSlice';
import { refreshCurrentUser } from '../auth/sessionThunks';
import {
  connectionChanged,
  presenceChanged,
  realtimeReset,
  typingChanged,
} from './realtimeSlice';

const RECONNECT_AFTER_FAILURE_MS = 5000;
const AUTH_ERROR_CODES = ['TOKEN_EXPIRED', 'UNAUTHENTICATED'];

/** Inserts a delivered message into the open thread cache, replacing its optimistic copy. */
export function applyIncomingMessage(dispatch, { message, conversation }) {
  dispatch(
    api.util.updateQueryData('listMessages', message.conversationId, (draft) => {
      const newestPage = draft.pages[0];
      if (!newestPage) return;
      if (draft.pages.some((page) => page.items.some((item) => item.id === message.id))) return;
      const optimisticIndex = message.clientId
        ? newestPage.items.findIndex((item) => item.clientId === message.clientId)
        : -1;
      if (optimisticIndex >= 0) newestPage.items[optimisticIndex] = message;
      else newestPage.items.push(message);
    }),
  );

  let listed = false;
  dispatch(
    api.util.updateQueryData('listConversations', undefined, (draft) => {
      const index = draft.items.findIndex((item) => item.id === conversation.id);
      if (index === -1) return;
      listed = true;
      const [item] = draft.items.splice(index, 1);
      Object.assign(item, {
        lastMessage: conversation.lastMessage,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount: conversation.unreadCount,
      });
      draft.items.unshift(item);
    }),
  );

  const tags = ['UnreadMessages', { type: 'Conversation', id: 'QUOTA' }];
  if (!listed) tags.push({ type: 'Conversation', id: 'LIST' });
  dispatch(api.util.invalidateTags(tags));
}

function applyConversationRead(dispatch, currentUserId, { conversationId, userId, lastReadAt }) {
  dispatch(
    api.util.updateQueryData('listConversations', undefined, (draft) => {
      const item = draft.items.find((conversation) => conversation.id === conversationId);
      if (!item) return;
      if (userId === currentUserId) item.unreadCount = 0;
      else item.participantLastReadAt = lastReadAt;
    }),
  );
  dispatch(
    api.util.updateQueryData('getConversation', conversationId, (draft) => {
      if (userId === currentUserId) draft.unreadCount = 0;
      else draft.participantLastReadAt = lastReadAt;
    }),
  );
}

function applyNotification(dispatch, getState, notification) {
  api.util.selectCachedArgsForQuery(getState(), 'listNotifications').forEach((args) => {
    dispatch(
      api.util.updateQueryData('listNotifications', args, (draft) => {
        const firstPage = draft.pages[0];
        if (!firstPage) return;
        draft.pages.forEach((page) => {
          page.items = page.items.filter((item) => item.id !== notification.id);
        });
        firstPage.items.unshift(notification);
      }),
    );
  });

  // Messages have their own inbox badge and live thread UI; everything else gets a subtle toast.
  if (notification.type !== 'message') {
    const who = notification.actor ? `${notification.actor.name} ` : '';
    toast(`${who}${notification.title}`, { description: notification.body || undefined });
  }
}

/**
 * Owns the socket lifecycle for an authenticated session and translates server events into
 * cache updates. Mount once inside the authenticated shell.
 */
export function useRealtimeBridge(userId) {
  const dispatch = useDispatch();
  const store = useStore();

  useEffect(() => {
    if (!userId) return undefined;

    const socket = connectSocket(() => store.getState().auth.accessToken);
    let retryTimer = null;

    const handlers = {
      connect: () => dispatch(connectionChanged(true)),
      disconnect: () => dispatch(connectionChanged(false)),
      connect_error: async (error) => {
        dispatch(connectionChanged(false));
        if (!AUTH_ERROR_CODES.includes(error?.data?.code)) return;
        // Handshake auth failures are not retried by Socket.io; refresh the token and reconnect.
        try {
          const session = await refreshSession();
          if (!session) {
            dispatch(sessionEnded());
            return;
          }
          dispatch(sessionStarted(session));
          socket.connect();
        } catch {
          retryTimer = setTimeout(() => socket.connect(), RECONNECT_AFTER_FAILURE_MS);
        }
      },
      [SOCKET_EVENTS.RECEIVE_MESSAGE]: (payload) => applyIncomingMessage(dispatch, payload),
      [SOCKET_EVENTS.CONVERSATION_READ]: (payload) => applyConversationRead(dispatch, userId, payload),
      [SOCKET_EVENTS.USER_TYPING]: (payload) => dispatch(typingChanged(payload)),
      [SOCKET_EVENTS.USER_ONLINE]: ({ userId: id }) => dispatch(presenceChanged({ userId: id, online: true })),
      [SOCKET_EVENTS.USER_OFFLINE]: ({ userId: id }) => dispatch(presenceChanged({ userId: id, online: false })),
      [SOCKET_EVENTS.NOTIFICATION_NEW]: (notification) => applyNotification(dispatch, store.getState, notification),
      [SOCKET_EVENTS.NOTIFICATION_COUNT]: ({ unreadCount }) =>
        dispatch(api.util.upsertQueryData('getUnreadNotificationCount', undefined, unreadCount)),
      [SOCKET_EVENTS.SESSION_UPDATED]: () => {
        dispatch(refreshCurrentUser());
        dispatch(api.util.invalidateTags(['Subscription', 'Post', 'Community', 'Project', 'Conversation']));
      },
    };

    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
    if (socket.connected) dispatch(connectionChanged(true));

    return () => {
      clearTimeout(retryTimer);
      Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
    };
  }, [userId, dispatch, store]);

  useEffect(() => {
    if (userId) return undefined;
    disconnectSocket();
    dispatch(realtimeReset());
    return undefined;
  }, [userId, dispatch]);
}
