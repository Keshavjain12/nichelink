import { describe, expect, it } from 'vitest';
import { PERMISSIONS, permissionsForRole } from '../src/constants/permissions.js';
import { ROLES } from '../src/constants/roles.js';
import { requirePermission } from '../src/middleware/authenticate.js';
import { resolveEffectiveRole } from '../src/services/accessService.js';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('resolveEffectiveRole', () => {
  it('treats a missing user as Guest', () => {
    expect(resolveEffectiveRole(null)).toBe(ROLES.GUEST);
  });

  it('keeps Admin regardless of subscription', () => {
    expect(resolveEffectiveRole({ role: ROLES.ADMIN, subscription: { status: 'none' } })).toBe(
      ROLES.ADMIN,
    );
  });

  it('grants Pro only for entitled subscription states', () => {
    const future = new Date(Date.now() + 10 * DAY_MS);
    expect(
      resolveEffectiveRole({
        role: ROLES.FREE,
        subscription: { status: 'active', currentPeriodEnd: future },
      }),
    ).toBe(ROLES.PRO);
    expect(
      resolveEffectiveRole({
        role: ROLES.FREE,
        subscription: { status: 'past_due', currentPeriodEnd: future },
      }),
    ).toBe(ROLES.PRO);
    expect(
      resolveEffectiveRole({
        role: ROLES.PRO,
        subscription: { status: 'canceled', currentPeriodEnd: future },
      }),
    ).toBe(ROLES.FREE);
    expect(resolveEffectiveRole({ role: ROLES.PRO, subscription: { status: 'unpaid' } })).toBe(
      ROLES.FREE,
    );
  });

  it('does not trust a stale persisted ProMember role once the period has long ended', () => {
    const longAgo = new Date(Date.now() - 10 * DAY_MS);
    expect(
      resolveEffectiveRole({
        role: ROLES.PRO,
        subscription: { status: 'active', currentPeriodEnd: longAgo },
      }),
    ).toBe(ROLES.FREE);
  });
});

describe('permission map', () => {
  it('reserves posting, commenting and Pro communities for Pro and Admin', () => {
    for (const permission of [
      PERMISSIONS.POST_CREATE,
      PERMISSIONS.COMMENT_CREATE,
      PERMISSIONS.COMMUNITY_JOIN_PRO,
    ]) {
      expect(permissionsForRole(ROLES.GUEST)).not.toContain(permission);
      expect(permissionsForRole(ROLES.FREE)).not.toContain(permission);
      expect(permissionsForRole(ROLES.PRO)).toContain(permission);
      expect(permissionsForRole(ROLES.ADMIN)).toContain(permission);
    }
  });

  it('reserves admin access for Admin only', () => {
    expect(permissionsForRole(ROLES.PRO)).not.toContain(PERMISSIONS.ADMIN_ACCESS);
    expect(permissionsForRole(ROLES.ADMIN)).toContain(PERMISSIONS.ADMIN_ACCESS);
  });
});

describe('requirePermission middleware', () => {
  const run = (user, ...permissions) => {
    const req = { user: user && { ...user, permissions: permissionsForRole(user.role) } };
    let passed = false;
    try {
      requirePermission(...permissions)(req, {}, () => {
        passed = true;
      });
      return { passed };
    } catch (error) {
      return { passed, error };
    }
  };

  it('returns 401 for guests', () => {
    expect(run(null, PERMISSIONS.POST_CREATE).error.statusCode).toBe(401);
  });

  it('signals PRO_REQUIRED when an upgrade would grant access', () => {
    const { error } = run({ role: ROLES.FREE }, PERMISSIONS.POST_CREATE);
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('PRO_REQUIRED');
  });

  it('returns plain FORBIDDEN for admin-only permissions', () => {
    const { error } = run({ role: ROLES.PRO }, PERMISSIONS.ADMIN_ACCESS);
    expect(error.code).toBe('FORBIDDEN');
  });

  it('passes when the role has the permission', () => {
    expect(run({ role: ROLES.PRO }, PERMISSIONS.POST_CREATE).passed).toBe(true);
  });
});
