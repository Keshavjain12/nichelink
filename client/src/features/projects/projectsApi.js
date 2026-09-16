import { api, unwrapData, unwrapList } from '../../app/api';
import { cleanParams } from '../../utils/params';

const LIST = { type: 'Project', id: 'LIST' };

export const projectsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listProjects: build.infiniteQuery({
      infiniteQueryOptions: {
        initialPageParam: 1,
        getNextPageParam: (lastPage, _allPages, lastPageParam) => (lastPage.meta.hasMore ? lastPageParam + 1 : undefined),
      },
      query: ({ queryArg, pageParam }) => ({
        url: '/projects',
        params: cleanParams({ limit: 12, ...queryArg, page: pageParam }),
      }),
      transformResponse: unwrapList,
      providesTags: [LIST],
    }),
    getProject: build.query({
      query: (id) => `/projects/${id}`,
      transformResponse: unwrapData,
      providesTags: (_result, _error, id) => [{ type: 'Project', id }],
    }),
    createProject: build.mutation({
      query: (body) => ({ url: '/projects', method: 'POST', body }),
      transformResponse: unwrapData,
      invalidatesTags: [LIST, 'Profile'],
    }),
    updateProject: build.mutation({
      query: ({ id, ...body }) => ({ url: `/projects/${id}`, method: 'PATCH', body }),
      transformResponse: unwrapData,
      invalidatesTags: (_result, _error, { id }) => [LIST, { type: 'Project', id }],
    }),
    deleteProject: build.mutation({
      query: (id) => ({ url: `/projects/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [LIST, { type: 'Project', id }, 'Profile'],
    }),
    expressInterest: build.mutation({
      query: ({ id, message }) => ({ url: `/projects/${id}/interests`, method: 'POST', body: { message } }),
      transformResponse: unwrapData,
      invalidatesTags: (_result, _error, { id }) => [LIST, { type: 'Project', id }],
    }),
    withdrawInterest: build.mutation({
      query: (id) => ({ url: `/projects/${id}/interests/me`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [LIST, { type: 'Project', id }],
    }),
    listProjectInterests: build.query({
      query: (id) => ({ url: `/projects/${id}/interests`, params: { limit: 50 } }),
      transformResponse: unwrapList,
      providesTags: (_result, _error, id) => [{ type: 'ProjectInterest', id }],
    }),
    updateProjectInterest: build.mutation({
      query: ({ projectId, interestId, status }) => ({
        url: `/projects/${projectId}/interests/${interestId}`,
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: unwrapData,
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'ProjectInterest', id: projectId }],
    }),
  }),
});

export const {
  useListProjectsInfiniteQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useExpressInterestMutation,
  useWithdrawInterestMutation,
  useListProjectInterestsQuery,
  useUpdateProjectInterestMutation,
} = projectsApi;
