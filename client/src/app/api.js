import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../constants/app';
import { sessionEnded, sessionStarted } from '../features/auth/authSlice';
import { refreshSession } from '../services/session';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
  // Resolve fetch at call time rather than capturing it at module load, so tests can stub it.
  fetchFn: (...args) => globalThis.fetch(...args),
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    headers.set('X-Requested-With', 'XMLHttpRequest');
    return headers;
  },
});

const SESSION_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];
const isSessionEndpoint = (args) => SESSION_ENDPOINTS.includes(typeof args === 'string' ? args : args.url);

/** Transparently refreshes an expired access token once, then retries the original request. */
async function baseQueryWithReauth(args, api, extraOptions) {
  let result = await rawBaseQuery(args, api, extraOptions);
  const hadSession = Boolean(api.getState().auth.accessToken);

  if (result.error?.status === 401 && hadSession && !isSessionEndpoint(args)) {
    let session;
    try {
      session = await refreshSession();
    } catch {
      // Offline: keep the session and surface the original error to the caller.
      return result;
    }

    if (session) {
      api.dispatch(sessionStarted(session));
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(sessionEnded());
    }
  }
  return result;
}

export const unwrapData = (response) => response.data;
export const unwrapList = (response) => ({ items: response.data, meta: response.meta ?? {} });

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Me',
    'Config',
    'Community',
    'MyCommunities',
    'Member',
    'Post',
    'Comment',
    'Conversation',
    'Message',
    'UnreadMessages',
    'Notification',
    'Project',
    'ProjectInterest',
    'Profile',
    'Subscription',
    'Search',
    'Admin',
    'Report',
  ],
  endpoints: (build) => ({
    getConfig: build.query({ query: () => '/config', transformResponse: unwrapData, providesTags: ['Config'] }),
  }),
});

export const { useGetConfigQuery } = api;
