export const SOCKET_EVENTS = Object.freeze({
  // client → server
  JOIN_CONVERSATION: 'join_conversation',
  LEAVE_CONVERSATION: 'leave_conversation',
  SEND_MESSAGE: 'send_message',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  MESSAGE_READ: 'message_read',
  PRESENCE_QUERY: 'presence_query',

  // server → client
  RECEIVE_MESSAGE: 'receive_message',
  CONVERSATION_UPDATED: 'conversation_updated',
  CONVERSATION_READ: 'conversation_read',
  USER_TYPING: 'user_typing',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  NOTIFICATION_NEW: 'notification_new',
  NOTIFICATION_COUNT: 'notification_count',
  SESSION_UPDATED: 'session_updated',
});
