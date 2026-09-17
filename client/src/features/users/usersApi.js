import { api, unwrapData } from '../../app/api';
import { userUpdated } from '../auth/authSlice';

async function syncSessionUser(_arg, { dispatch, queryFulfilled }) {
  try {
    const { data } = await queryFulfilled;
    dispatch(userUpdated(data.user));
  } catch {
    // Errors are surfaced by the calling form.
  }
}

export const usersApi = api.injectEndpoints({
  endpoints: (build) => ({
    getProfile: build.query({
      query: (username) => `/users/${username}`,
      transformResponse: unwrapData,
      providesTags: (_result, _error, username) => [{ type: 'Profile', id: username }, 'Profile'],
    }),
    getProfileCommunities: build.query({
      query: (username) => `/users/${username}/communities`,
      transformResponse: unwrapData,
      providesTags: ['Profile', 'MyCommunities'],
    }),
    updateProfile: build.mutation({
      query: (body) => ({ url: '/users/me', method: 'PATCH', body }),
      transformResponse: unwrapData,
      onQueryStarted: syncSessionUser,
      invalidatesTags: ['Profile', { type: 'Post', id: 'LIST' }],
    }),
    uploadAvatar: build.mutation({
      query: (file) => {
        const body = new FormData();
        body.append('image', file);
        return { url: '/users/me/avatar', method: 'POST', body };
      },
      transformResponse: unwrapData,
      onQueryStarted: syncSessionUser,
      invalidatesTags: ['Profile'],
    }),
    removeAvatar: build.mutation({
      query: () => ({ url: '/users/me/avatar', method: 'DELETE' }),
      transformResponse: unwrapData,
      onQueryStarted: syncSessionUser,
      invalidatesTags: ['Profile'],
    }),
    search: build.query({
      query: ({ q, type = 'all', page = 1 }) => ({
        url: '/search',
        params: { q, type, page, limit: 20 },
      }),
      transformResponse: unwrapData,
      providesTags: ['Search'],
    }),
    getSearchSuggestions: build.query({
      query: (q) => ({ url: '/search/suggestions', params: { q } }),
      transformResponse: unwrapData,
    }),
  }),
});

export const {
  useGetProfileQuery,
  useGetProfileCommunitiesQuery,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useRemoveAvatarMutation,
  useSearchQuery,
  useGetSearchSuggestionsQuery,
} = usersApi;
