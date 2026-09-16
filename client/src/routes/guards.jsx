import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageLoader } from '../components/common/Feedback';
import { useAuth } from '../hooks/useAuth';
import ForbiddenPage from '../pages/ForbiddenPage';

/** Redirects guests to sign-in, preserving where they were going. */
export function RequireAuth() {
  const { isAuthenticated, isResolving } = useAuth();
  const location = useLocation();

  if (isResolving) return <PageLoader />;
  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  return <Outlet />;
}

export function RequireGuest() {
  const { isAuthenticated, isResolving } = useAuth();
  if (isResolving) return <PageLoader />;
  return isAuthenticated ? <Navigate to="/feed" replace /> : <Outlet />;
}

/** UX guard only — the API independently rejects requests without the permission. */
export function RequirePermission({ permission }) {
  const { can } = useAuth();
  return can(permission) ? <Outlet /> : <ForbiddenPage />;
}
