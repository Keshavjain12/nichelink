import { api, unwrapList } from '../../app/api';

export const notificationsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listNotifications: build.infiniteQuery({
      infiniteQueryOptions: {
        initialPageParam: 1,
        getNextPageParam: (lastPage, _allPages, lastPageParam) =>
          lastPage.meta.hasMore ? lastPageParam + 1 : undefined,
      },
      query: ({ queryArg, pageParam }) => ({
        url: '/notifications',
        params: { page: pageParam, limit: 20, ...(queryArg?.unread && { unread: 'true' }) },
      }),
      transformResponse: unwrapList,
      providesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
    getUnreadNotificationCount: build.query({
      query: () => '/notifications/unread-count',
      transformResponse: (response) => response.data.unreadCount,
      providesTags: [{ type: 'Notification', id: 'COUNT' }],
    }),
    markNotificationRead: build.mutation({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      async onQueryStarted(id, { dispatch, getState, queryFulfilled }) {
        const patches = api.util
          .selectCachedArgsForQuery(getState(), 'listNotifications')
          .map((args) =>
            dispatch(
              api.util.updateQueryData('listNotifications', args, (draft) => {
                draft.pages.forEach((page) =>
                  page.items.forEach((item) => {
                    if (item.id === id) item.isRead = true;
                  }),
                );
              }),
            ),
          );
        try {
          const { data } = await queryFulfilled;
          dispatch(
            api.util.upsertQueryData(
              'getUnreadNotificationCount',
              undefined,
              data.data.unreadCount,
            ),
          );
        } catch {
          patches.forEach((patch) => patch.undo());
        }
      },
    }),
    markAllNotificationsRead: build.mutation({
      query: () => ({ url: '/notifications/read-all', method: 'PATCH' }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'COUNT' },
      ],
    }),
  }),
});

export const {
  useListNotificationsInfiniteQuery,
  useGetUnreadNotificationCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;
