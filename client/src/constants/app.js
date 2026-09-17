export const APP_NAME = 'NicheLink';

export const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

/** Empty string means "same origin" (the Vite dev proxy forwards /socket.io). */
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

export const SHOW_DEMO_ACCOUNTS =
  import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true';

export const STORAGE_KEYS = Object.freeze({
  THEME: 'nichelink:theme',
  FEED_SORT: 'nichelink:feed-sort',
  POST_DRAFT: 'nichelink:post-draft',
});

/** Permission identifiers issued by the API in `user.permissions`. The server enforces them. */
export const PERMISSIONS = Object.freeze({
  CONTENT_READ: 'content:read',
  COMMUNITY_JOIN: 'community:join',
  COMMUNITY_JOIN_PRO: 'community:join-pro',
  COMMUNITY_MANAGE: 'community:manage',
  POST_CREATE: 'post:create',
  COMMENT_CREATE: 'comment:create',
  REACTION_TOGGLE: 'reaction:toggle',
  UPLOAD_POST_IMAGE: 'upload:post-image',
  UPLOAD_AVATAR: 'upload:avatar',
  MESSAGE_SEND: 'message:send',
  MESSAGE_UNLIMITED: 'message:unlimited',
  PROJECT_CREATE: 'project:create',
  PROJECT_INTEREST: 'project:interest',
  REPORT_CREATE: 'report:create',
  CONTENT_MODERATE: 'content:moderate',
  ADMIN_ACCESS: 'admin:access',
});

export const ERROR_CODES = Object.freeze({
  PRO_REQUIRED: 'PRO_REQUIRED',
  MEMBERSHIP_REQUIRED: 'MEMBERSHIP_REQUIRED',
  DM_LIMIT_REACHED: 'DM_LIMIT_REACHED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  FEATURE_NOT_CONFIGURED: 'FEATURE_NOT_CONFIGURED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
});

export const SOCKET_EVENTS = Object.freeze({
  JOIN_CONVERSATION: 'join_conversation',
  LEAVE_CONVERSATION: 'leave_conversation',
  SEND_MESSAGE: 'send_message',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  MESSAGE_READ: 'message_read',
  PRESENCE_QUERY: 'presence_query',
  RECEIVE_MESSAGE: 'receive_message',
  CONVERSATION_READ: 'conversation_read',
  USER_TYPING: 'user_typing',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  NOTIFICATION_NEW: 'notification_new',
  NOTIFICATION_COUNT: 'notification_count',
  SESSION_UPDATED: 'session_updated',
});
