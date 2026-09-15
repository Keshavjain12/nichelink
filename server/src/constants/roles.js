export const ROLES = Object.freeze({
  GUEST: 'Guest',
  FREE: 'FreeMember',
  PRO: 'ProMember',
  ADMIN: 'Admin',
});

/** Roles that can be stored on a user document (Guest is simply "not authenticated"). */
export const PERSISTED_ROLES = Object.freeze([ROLES.FREE, ROLES.PRO, ROLES.ADMIN]);

export const ACCOUNT_STATUS = Object.freeze({
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
});

export const COMMUNITY_ROLES = Object.freeze({
  MEMBER: 'member',
  MODERATOR: 'moderator',
  OWNER: 'owner',
});

export const COMMUNITY_ACCESS = Object.freeze({
  PUBLIC: 'public',
  PRO: 'pro',
});
