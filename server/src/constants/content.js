export const COMMUNITY_CATEGORIES = Object.freeze([
  'Engineering',
  'AI & Data',
  'Product',
  'Design',
  'Writing',
  'Business',
  'Lifestyle',
]);

export const CONTENT_STATUS = Object.freeze({
  PUBLISHED: 'published',
  REMOVED: 'removed',
  DELETED: 'deleted',
});

export const CONTENT_LIMITS = Object.freeze({
  POST_TITLE_MIN: 5,
  POST_TITLE_MAX: 160,
  POST_CONTENT_MAX_HTML: 40_000,
  POST_CONTENT_MAX_TEXT: 15_000,
  POST_EXCERPT_LENGTH: 280,
  POST_MAX_IMAGES: 4,
  POST_MAX_TAGS: 5,
  COMMENT_MAX: 5_000,
  COMMENT_MAX_DEPTH: 4,
  MESSAGE_MAX: 2_000,
  PROJECT_DESCRIPTION_MAX: 5_000,
  PROJECT_MAX_SKILLS: 12,
  PROFILE_MAX_SKILLS: 20,
  REPORT_DETAILS_MAX: 1_000,
});

export const REACTION_TYPES = Object.freeze(['like']);

export const PROJECT_TYPES = Object.freeze([
  'side-project',
  'startup',
  'open-source',
  'freelance',
  'contract',
  'full-time',
]);

export const PROJECT_COMMITMENTS = Object.freeze(['few-hours-week', 'part-time', 'full-time']);

export const PROJECT_COMPENSATION = Object.freeze(['paid', 'equity', 'revenue-share', 'volunteer']);

export const REPORT_TARGET_TYPES = Object.freeze(['Post', 'Comment', 'User']);

export const REPORT_REASONS = Object.freeze([
  'spam',
  'harassment',
  'hate',
  'misinformation',
  'off-topic',
  'inappropriate',
  'other',
]);

export const REPORT_STATUS = Object.freeze({
  OPEN: 'open',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
});

export const NOTIFICATION_TYPES = Object.freeze({
  MESSAGE: 'message',
  POST_COMMENT: 'post_comment',
  COMMENT_REPLY: 'comment_reply',
  POST_REACTION: 'post_reaction',
  PROJECT_INTEREST: 'project_interest',
  PROJECT_INTEREST_UPDATE: 'project_interest_update',
  SUBSCRIPTION: 'subscription',
  ACCOUNT: 'account',
  MODERATION: 'moderation',
});

export const UPLOAD_LIMITS = Object.freeze({
  MAX_IMAGE_BYTES: 5 * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: Object.freeze(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
});
