import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from '../constants/app';
import { authenticatedState, guestState, renderWithProviders } from '../test/utils';
import { safeRedirectPath } from '../utils/navigation';
import { RequireAuth, RequireGuest, RequirePermission } from './guards';

const routes = (
  <Routes>
    <Route path="/login" element={<h1>Sign in</h1>} />
    <Route path="/feed" element={<h1>Your feed</h1>} />
    <Route element={<RequireAuth />}>
      <Route path="/messages" element={<h1>Messages</h1>} />
      <Route element={<RequirePermission permission={PERMISSIONS.ADMIN_ACCESS} />}>
        <Route path="/admin" element={<h1>Admin dashboard</h1>} />
      </Route>
    </Route>
    <Route element={<RequireGuest />}>
      <Route path="/register" element={<h1>Create account</h1>} />
    </Route>
  </Routes>
);

describe('route guards', () => {
  it('sends guests to the sign-in page and keeps the intended destination', () => {
    renderWithProviders(routes, { preloadedState: guestState, route: '/messages' });
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Messages' })).not.toBeInTheDocument();
  });

  it('shows a loader instead of redirecting while the session is still resolving', () => {
    renderWithProviders(routes, {
      preloadedState: { auth: { status: 'loading', accessToken: null, user: null, bootError: null } },
      route: '/messages',
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('renders protected routes for authenticated members', () => {
    renderWithProviders(routes, { preloadedState: authenticatedState(), route: '/messages' });
    expect(screen.getByRole('heading', { name: 'Messages' })).toBeInTheDocument();
  });

  it('blocks non-admins from admin routes and allows admins through', () => {
    const { unmount } = renderWithProviders(routes, { preloadedState: authenticatedState({ role: 'ProMember' }), route: '/admin' });
    expect(screen.getByText(/don't have access/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Admin dashboard' })).not.toBeInTheDocument();
    unmount();

    renderWithProviders(routes, { preloadedState: authenticatedState({ role: 'Admin' }), route: '/admin' });
    expect(screen.getByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
  });

  it('keeps signed-in members away from guest-only routes', () => {
    renderWithProviders(routes, { preloadedState: authenticatedState(), route: '/register' });
    expect(screen.getByRole('heading', { name: 'Your feed' })).toBeInTheDocument();
  });
});

describe('safeRedirectPath', () => {
  it('allows same-site paths and rejects absolute or protocol-relative URLs', () => {
    expect(safeRedirectPath('/communities/saas-developers')).toBe('/communities/saas-developers');
    expect(safeRedirectPath('//evil.example/phish')).toBe('/feed');
    expect(safeRedirectPath('https://evil.example')).toBe('/feed');
    expect(safeRedirectPath(undefined)).toBe('/feed');
  });
});
