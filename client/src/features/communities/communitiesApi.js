import { api, unwrapData, unwrapList } from '../../app/api';
import { cleanParams } from '../../utils/params';

const communityTag = (slug) => ({ type: 'Community', id: slug });
const LIST = { type: 'Community', id: 'LIST' };

const membershipInvalidations = (_result, _error, slug) => [
  communityTag(slug),
  LIST,
  'MyCommunities',
  { type: 'Post', id: 'LIST' },
];

export const communitiesApi = api.injectEndpoints({
  endpoints: (build) => ({
    listCommunities: build.query({
      query: (params = {}) => ({ url: '/communities', params: cleanParams(params) }),
      transformResponse: unwrapList,
      providesTags: (result) => [
        LIST,
        ...(result?.items ?? []).map((community) => communityTag(community.slug)),
      ],
    }),
    getCommunity: build.query({
      query: (slug) => `/communities/${slug}`,
      transformResponse: unwrapData,
      providesTags: (_result, _error, slug) => [communityTag(slug)],
    }),
    getTrendingCommunities: build.query({
      query: () => '/communities/trending',
      transformResponse: unwrapData,
      providesTags: [LIST],
    }),
    getRecommendedCommunities: build.query({
      query: () => '/communities/recommended',
      transformResponse: unwrapData,
      providesTags: [LIST, 'MyCommunities'],
    }),
    getMyCommunities: build.query({
      query: () => '/memberships/me',
      transformResponse: unwrapData,
      providesTags: ['MyCommunities'],
    }),
    getCommunityMembers: build.query({
      query: ({ slug, page = 1 }) => ({
        url: `/communities/${slug}/members`,
        params: { page, limit: 24 },
      }),
      transformResponse: unwrapList,
      providesTags: (_result, _error, { slug }) => [{ type: 'Member', id: slug }],
    }),
    createCommunity: build.mutation({
      query: (body) => ({ url: '/communities', method: 'POST', body }),
      transformResponse: unwrapData,
      invalidatesTags: [LIST, 'MyCommunities', 'Admin'],
    }),
    updateCommunity: build.mutation({
      query: ({ slug, ...body }) => ({ url: `/communities/${slug}`, method: 'PATCH', body }),
      transformResponse: unwrapData,
      invalidatesTags: (_result, _error, { slug }) => [
        communityTag(slug),
        LIST,
        'Admin',
        { type: 'Post', id: 'LIST' },
      ],
    }),
    joinCommunity: build.mutation({
      query: (slug) => ({ url: `/communities/${slug}/join`, method: 'POST' }),
      transformResponse: unwrapData,
      invalidatesTags: membershipInvalidations,
    }),
    leaveCommunity: build.mutation({
      query: (slug) => ({ url: `/communities/${slug}/membership`, method: 'DELETE' }),
      transformResponse: unwrapData,
      invalidatesTags: membershipInvalidations,
    }),
  }),
});

export const {
  useListCommunitiesQuery,
  useGetCommunityQuery,
  useGetTrendingCommunitiesQuery,
  useGetRecommendedCommunitiesQuery,
  useGetMyCommunitiesQuery,
  useGetCommunityMembersQuery,
  useCreateCommunityMutation,
  useUpdateCommunityMutation,
  useJoinCommunityMutation,
  useLeaveCommunityMutation,
} = communitiesApi;
