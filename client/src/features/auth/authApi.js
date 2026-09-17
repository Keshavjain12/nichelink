import { api, unwrapData } from '../../app/api';
import { sessionStarted, userUpdated } from './authSlice';

async function startSessionOnSuccess(_arg, { dispatch, queryFulfilled }) {
  try {
    const { data } = await queryFulfilled;
    dispatch(sessionStarted(data));
  } catch {
    // The failure is returned to the component through the mutation result.
  }
}

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      transformResponse: unwrapData,
      onQueryStarted: startSessionOnSuccess,
    }),
    register: build.mutation({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      transformResponse: unwrapData,
      onQueryStarted: startSessionOnSuccess,
    }),
    logout: build.mutation({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
    }),
    getMe: build.query({
      query: () => '/auth/me',
      transformResponse: (response) => response.data.user,
      providesTags: ['Me'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(userUpdated(data));
        } catch {
          // Auth failures are handled by the re-auth base query.
        }
      },
    }),
    changePassword: build.mutation({
      query: (body) => ({ url: '/auth/password', method: 'PATCH', body }),
      transformResponse: unwrapData,
      onQueryStarted: startSessionOnSuccess,
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useChangePasswordMutation,
} = authApi;
