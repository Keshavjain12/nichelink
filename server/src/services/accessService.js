import { ENTITLED_SUBSCRIPTION_STATUSES } from '../constants/plans.js';
import { permissionsForRole, roleHasPermission } from '../constants/permissions.js';
import { COMMUNITY_ACCESS, ROLES } from '../constants/roles.js';

/** Stripe renews at period end; tolerate delayed renewal webhooks before revoking access. */
const RENEWAL_GRACE_MS = 48 * 60 * 60 * 1000;

export function isSubscriptionEntitled(subscription, now = Date.now()) {
  if (!subscription || !ENTITLED_SUBSCRIPTION_STATUSES.includes(subscription.status)) return false;
  if (!subscription.currentPeriodEnd) return true;
  return new Date(subscription.currentPeriodEnd).getTime() + RENEWAL_GRACE_MS > now;
}

/**
 * The effective role is derived on every request: Admin is an explicit grant, Pro comes only from
 * verified subscription state (so a missed cancellation webhook still expires access), and
 * everyone else is a FreeMember.
 */
export function resolveEffectiveRole(user, now = Date.now()) {
  if (!user) return ROLES.GUEST;
  if (user.role === ROLES.ADMIN) return ROLES.ADMIN;
  return isSubscriptionEntitled(user.subscription, now) ? ROLES.PRO : ROLES.FREE;
}

export function buildRequestUser(userDoc) {
  const role = resolveEffectiveRole(userDoc);
  return {
    id: String(userDoc._id),
    _id: userDoc._id,
    role,
    permissions: permissionsForRole(role),
    username: userDoc.username,
    name: userDoc.name,
    status: userDoc.status,
  };
}

export function can(requestUser, permission) {
  return roleHasPermission(requestUser?.role ?? ROLES.GUEST, permission);
}

export function canAccessCommunityContent(requestUser, community) {
  if (community.accessType !== COMMUNITY_ACCESS.PRO) return true;
  return requestUser?.role === ROLES.PRO || requestUser?.role === ROLES.ADMIN;
}

/** Community access types a viewer may read content from. */
export function readableAccessTypes(requestUser) {
  return canAccessCommunityContent(requestUser, { accessType: COMMUNITY_ACCESS.PRO })
    ? [COMMUNITY_ACCESS.PUBLIC, COMMUNITY_ACCESS.PRO]
    : [COMMUNITY_ACCESS.PUBLIC];
}
