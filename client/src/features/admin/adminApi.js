import { api, unwrapData, unwrapList } from '../../app/api';
import { cleanParams } from '../../utils/params';

export const adminApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAdminStats: build.query({
      query: () => '/admin/stats',
      transformResponse: unwrapData,
      providesTags: ['Admin', 'Report'],
    }),
    listAdminUsers: build.query({
      query: (params) => ({ url: '/admin/users', params: cleanParams({ limit: 20, ...params }) }),
      transformResponse: unwrapList,
      providesTags: ['Admin'],
    }),
    updateUserStatus: build.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/users/${id}/status`, method: 'PATCH', body }),
      transformResponse: unwrapData,
      invalidatesTags: ['Admin'],
    }),
    updateUserAdmin: build.mutation({
      query: ({ id, isAdmin }) => ({
        url: `/admin/users/${id}/admin`,
        method: 'PATCH',
        body: { isAdmin },
      }),
      transformResponse: unwrapData,
      invalidatesTags: ['Admin'],
    }),
    listAdminCommunities: build.query({
      query: (params) => ({
        url: '/admin/communities',
        params: cleanParams({ limit: 20, ...params }),
      }),
      transformResponse: unwrapList,
      providesTags: ['Admin', { type: 'Community', id: 'LIST' }],
    }),
    listReports: build.query({
      query: (params) => ({ url: '/admin/reports', params: cleanParams({ limit: 20, ...params }) }),
      transformResponse: unwrapList,
      providesTags: ['Report'],
    }),
    resolveReport: build.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/reports/${id}`, method: 'PATCH', body }),
      transformResponse: unwrapData,
      invalidatesTags: ['Report', 'Admin', { type: 'Post', id: 'LIST' }],
    }),
    listAuditLogs: build.query({
      query: (params) => ({
        url: '/admin/audit-logs',
        params: cleanParams({ limit: 15, ...params }),
      }),
      transformResponse: unwrapList,
      providesTags: ['Admin'],
    }),
  }),
});

export const {
  useGetAdminStatsQuery,
  useListAdminUsersQuery,
  useUpdateUserStatusMutation,
  useUpdateUserAdminMutation,
  useListAdminCommunitiesQuery,
  useListReportsQuery,
  useResolveReportMutation,
  useListAuditLogsQuery,
} = adminApi;
