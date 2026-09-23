import { waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';
import { authApi } from './features/auth/authApi';
import { communitiesApi } from './features/communities/communitiesApi';
import { buildUser, mockApi, renderWithProviders } from './test/utils';

const session = (role = 'FreeMember') => ({
  success: true,
  data: { accessToken: 'fresh-token', user: buildUser({ role }) },
});

const config = { success: true, data: { features: {}, plans: [], limits: {} } };

const tick = (ms = 500) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

describe('session bootstrap', () => {
  it('waits for the refresh cookie before letting page queries run', async () => {
    // Load the lazy route up front so the only thing left to wait on is the session; otherwise
    // chunk loading hides the race this test exists to catch.
    await import('./pages/communities/CommunityPage');

    let releaseRefresh;
    const refreshed = new Promise((resolve) => {
      releaseRefresh = resolve;
    });
    const { calls } = mockApi({
      'POST /api/v1/auth/refresh': async () => {
        await refreshed;
        return session();
      },
      'GET /api/v1/config': config,
      'GET /api/v1/communities/digital-nomads': {
        success: true,
        data: { slug: 'digital-nomads', name: 'Digital Nomads', viewer: { isAuthenticated: true } },
      },
    });

    renderWithProviders(<App />, { route: '/communities/digital-nomads' });
    await tick();

    // Any request sent now would carry no access token, and RTK Query would cache that guest
    // response for the rest of the visit — the "Sign in to join" bug.
    expect(
      calls.filter((call) => call.key === 'GET /api/v1/communities/digital-nomads'),
    ).toHaveLength(0);

    releaseRefresh();
    await waitFor(() => {
      const request = calls.find((call) => call.key === 'GET /api/v1/communities/digital-nomads');
      expect(request?.headers.get('authorization')).toBe('Bearer fresh-token');
    });
  });
});

describe('signing in', () => {
  it('drops data cached while signed out so screens refetch as the new user', async () => {
    mockApi({
      'GET /api/v1/communities/digital-nomads': {
        success: true,
        data: {
          slug: 'digital-nomads',
          name: 'Digital Nomads',
          viewer: { isAuthenticated: false, isMember: false },
        },
      },
      'POST /api/v1/auth/login': session(),
    });
    const { store } = renderWithProviders(<div />);

    // Cache a guest response, the way browsing before signing in does.
    const guestView = await store
      .dispatch(communitiesApi.endpoints.getCommunity.initiate('digital-nomads'))
      .unwrap();
    expect(guestView.viewer.isAuthenticated).toBe(false);
    expect(Object.keys(store.getState().api.queries)).toHaveLength(1);

    await store
      .dispatch(authApi.endpoints.login.initiate({ email: 'member@example.com', password: 'pw' }))
      .unwrap();

    await waitFor(() => expect(Object.keys(store.getState().api.queries)).toHaveLength(0));
  });
});
