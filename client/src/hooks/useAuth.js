import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { PERMISSIONS } from '../constants/app';
import { selectAuth } from '../features/auth/authSlice';

/**
 * Session helpers for rendering decisions. Permissions come from the server's session payload;
 * the API re-checks every action, so this only shapes the UI.
 */
export function useAuth() {
  const { status, user, bootError } = useSelector(selectAuth);
  const can = useCallback((permission) => Boolean(user?.permissions?.includes(permission)), [user]);

  return {
    user,
    status,
    bootError,
    isAuthenticated: status === 'authenticated',
    isResolving: status === 'idle' || status === 'loading',
    isPro: user?.role === 'ProMember',
    isAdmin: can(PERMISSIONS.ADMIN_ACCESS),
    can,
  };
}
