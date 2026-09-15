import { ROLES } from '../constants/roles.js';
import { permissionsForRole } from '../constants/permissions.js';
import { resolveEffectiveRole } from '../services/accessService.js';

/** Fields required to render a user summary (and compute the Pro badge) when populating refs. */
export const USER_SUMMARY_FIELDS = 'name username avatar headline role subscription status';

const id = (value) => (value ? String(value) : null);

export function toUserSummary(user) {
  if (!user || typeof user !== 'object' || !user.username) return null;
  const role = resolveEffectiveRole(user);
  return {
    id: id(user._id),
    name: user.name,
    username: user.username,
    avatarUrl: user.avatar?.url ?? null,
    headline: user.headline ?? '',
    isPro: role === ROLES.PRO,
    isAdmin: role === ROLES.ADMIN,
    isSuspended: user.status === 'suspended',
  };
}

export function toPublicProfile(user) {
  return {
    ...toUserSummary(user),
    bio: user.bio ?? '',
    location: user.location ?? '',
    website: user.website ?? '',
    skills: user.skills ?? [],
    interests: user.interests ?? [],
    createdAt: user.createdAt,
  };
}

const COMPLETION_CHECKS = [
  (user) => Boolean(user.avatar?.url),
  (user) => Boolean(user.headline),
  (user) => (user.bio ?? '').length >= 20,
  (user) => Boolean(user.location),
  (user) => (user.skills ?? []).length >= 3,
  (user) => (user.interests ?? []).length >= 1,
];

export function profileCompletion(user) {
  const passed = COMPLETION_CHECKS.filter((check) => check(user)).length;
  return Math.round((passed / COMPLETION_CHECKS.length) * 100);
}

/** The signed-in user's own view: includes private account data, never secrets. */
export function toSessionUser(user) {
  const role = resolveEffectiveRole(user);
  return {
    ...toPublicProfile(user),
    email: user.email,
    role,
    permissions: permissionsForRole(role),
    status: user.status,
    subscription: {
      plan: user.subscription?.plan ?? 'free',
      status: user.subscription?.status ?? 'none',
      currentPeriodEnd: user.subscription?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: Boolean(user.subscription?.cancelAtPeriodEnd),
    },
    profileCompletion: profileCompletion(user),
    updatedAt: user.updatedAt,
  };
}

/** Admin table view. */
export function toAdminUser(user) {
  return {
    ...toUserSummary(user),
    email: user.email,
    role: resolveEffectiveRole(user),
    storedRole: user.role,
    status: user.status,
    suspensionReason: user.suspensionReason ?? null,
    subscriptionStatus: user.subscription?.status ?? 'none',
    createdAt: user.createdAt,
    lastActiveAt: user.lastActiveAt,
  };
}
