import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { createStore } from '../app/store';
import { PERMISSIONS } from '../constants/app';

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

export const PERMISSIONS_BY_ROLE = {
  FreeMember: MEMBER_PERMISSIONS,
  ProMember: PRO_PERMISSIONS,
  Admin: [...PRO_PERMISSIONS, P.COMMUNITY_MANAGE, P.CONTENT_MODERATE, P.ADMIN_ACCESS],
};

export function buildUser({ role = 'FreeMember', ...overrides } = {}) {
  return {
    id: '64b7f0f0f0f0f0f0f0f0f001',
    name: 'Daniel Okafor',
    username: 'daniel_okafor',
    email: 'daniel@example.com',
    avatarUrl: null,
    headline: 'Founding engineer',
    bio: '',
    location: '',
    website: '',
    skills: [],
    interests: [],
    role,
    permissions: PERMISSIONS_BY_ROLE[role],
    status: 'active',
    subscription: {
      plan: role === 'ProMember' ? 'pro' : 'free',
      status: role === 'ProMember' ? 'active' : 'none',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
    profileCompletion: 100,
    isPro: role === 'ProMember',
    isAdmin: role === 'Admin',
    ...overrides,
  };
}

export function authenticatedState(options) {
  return {
    auth: {
      status: 'authenticated',
      accessToken: 'test-token',
      user: buildUser(options),
      bootError: null,
    },
  };
}

export const guestState = {
  auth: { status: 'unauthenticated', accessToken: null, user: null, bootError: null },
};

/**
 * Stubs global fetch with a route table keyed by "METHOD /path".
 * Each entry is a body, a `{ status, body }` object, or a function of the request.
 */
export function mockApi(routes) {
  const calls = [];
  global.fetch = vi.fn(async (input, init = {}) => {
    // RTK Query calls fetch with a Request object, so method/body/headers live on it.
    const isRequest = typeof input !== 'string' && typeof input?.url === 'string';
    const url = new URL(isRequest ? input.url : input, 'http://localhost');
    const method = (init.method ?? (isRequest ? input.method : 'GET')).toUpperCase();
    const headers = isRequest ? input.headers : new Headers(init.headers ?? {});
    const rawBody = init.body ?? (isRequest ? await input.clone().text() : undefined);
    const key = `${method} ${url.pathname}`;

    let requestBody;
    try {
      requestBody = typeof rawBody === 'string' && rawBody ? JSON.parse(rawBody) : rawBody;
    } catch {
      requestBody = rawBody;
    }
    calls.push({ key, url, headers, body: requestBody, init });

    const handler = routes[key];
    if (!handler) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Unmocked ${key}`,
          code: 'NOT_FOUND',
          errors: [],
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    const resolved =
      typeof handler === 'function'
        ? await handler({ url, method, headers, body: requestBody })
        : handler;
    const { status = 200, body = resolved } = resolved?.status ? resolved : { body: resolved };
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  return { calls };
}

export const apiSuccess = (data, meta) => ({ success: true, data, ...(meta && { meta }) });
export const apiList = (items, meta = { page: 1, limit: 10, hasMore: false }) => ({
  success: true,
  data: items,
  meta,
});
export const apiError = (status, message, code) => ({
  status,
  body: { success: false, message, code, errors: [] },
});

export function renderWithProviders(ui, { preloadedState, route = '/' } = {}) {
  const store = createStore(preloadedState);
  const user = userEvent.setup();
  const result = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </Provider>,
  );
  return { ...result, store, user };
}
