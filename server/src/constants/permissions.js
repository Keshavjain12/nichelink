import { ROLES } from './roles.js';

/**
 * Central permission map. Route guards reference permissions, never raw role names,
 * so changing the product's tier rules happens in exactly one place.
 */
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

const P = PERMISSIONS;

const MEMBER_PERMISSIONS = [
  P.CONTENT_READ,
  P.COMMUNITY_JOIN,
  P.REACTION_TOGGLE,
  P.UPLOAD_AVATAR,
  P.MESSAGE_SEND,
  P.PROJECT_INTEREST,
  P.REPORT_CREATE,
];

const PRO_PERMISSIONS = [
  ...MEMBER_PERMISSIONS,
  P.COMMUNITY_JOIN_PRO,
  P.POST_CREATE,
  P.COMMENT_CREATE,
  P.UPLOAD_POST_IMAGE,
  P.MESSAGE_UNLIMITED,
  P.PROJECT_CREATE,
];

export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.GUEST]: Object.freeze([]),
  [ROLES.FREE]: Object.freeze(MEMBER_PERMISSIONS),
  [ROLES.PRO]: Object.freeze(PRO_PERMISSIONS),
  [ROLES.ADMIN]: Object.freeze([
    ...PRO_PERMISSIONS,
    P.COMMUNITY_MANAGE,
    P.CONTENT_MODERATE,
    P.ADMIN_ACCESS,
  ]),
});

export function permissionsForRole(role) {
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS[ROLES.GUEST];
}

export function roleHasPermission(role, permission) {
  return permissionsForRole(role).includes(permission);
}
