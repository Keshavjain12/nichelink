import { api, unwrapData, unwrapList } from '../../app/api';

const CONVERSATIONS = { type: 'Conversation', id: 'LIST' };

export const messagesApi = api.injectEndpoints({
  endpoints: (build) => ({
    listConversations: build.query({
      query: () => ({ url: '/conversations', params: { limit: 50 } }),
      transformResponse: unwrapList,
      providesTags: [CONVERSATIONS],
    }),
    getConversation: build.query({
      query: (id) => `/conversations/${id}`,
      transformResponse: unwrapData,
      providesTags: (_result, _error, id) => [{ type: 'Conversation', id }],
    }),
    startConversation: build.mutation({
      query: (recipientId) => ({ url: '/conversations', method: 'POST', body: { recipientId } }),
      transformResponse: unwrapData,
      invalidatesTags: [CONVERSATIONS],
    }),
    /** Pages go from newest to oldest; each page's items are in chronological order. */
    listMessages: build.infiniteQuery({
      infiniteQueryOptions: {
        initialPageParam: null,
        getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
      },
      query: ({ queryArg, pageParam }) => ({
        url: `/conversations/${queryArg}/messages`,
        params: { limit: 30, ...(pageParam && { before: pageParam }) },
      }),
      transformResponse: unwrapList,
      providesTags: (_result, _error, conversationId) => [{ type: 'Message', id: conversationId }],
    }),
    sendMessage: build.mutation({
      query: ({ conversationId, ...body }) => ({
        url: `/conversations/${conversationId}/messages`,
        method: 'POST',
        body,
      }),
      transformResponse: unwrapData,
    }),
    sendDirectMessage: build.mutation({
      query: (body) => ({ url: '/messages', method: 'POST', body }),
      transformResponse: unwrapData,
      invalidatesTags: [CONVERSATIONS, 'UnreadMessages'],
    }),
    markConversationRead: build.mutation({
      query: (conversationId) => ({
        url: `/conversations/${conversationId}/read`,
        method: 'PATCH',
      }),
      transformResponse: unwrapData,
      invalidatesTags: ['UnreadMessages'],
    }),
    getUnreadMessageCount: build.query({
      query: () => '/conversations/unread-count',
      transformResponse: (response) => response.data.unreadCount,
      providesTags: ['UnreadMessages'],
    }),
    getMessagingQuota: build.query({
      query: () => '/conversations/quota',
      transformResponse: unwrapData,
      providesTags: [{ type: 'Conversation', id: 'QUOTA' }],
    }),
  }),
});

export const {
  useListConversationsQuery,
  useGetConversationQuery,
  useStartConversationMutation,
  useListMessagesInfiniteQuery,
  useSendMessageMutation,
  useSendDirectMessageMutation,
  useMarkConversationReadMutation,
  useGetUnreadMessageCountQuery,
  useGetMessagingQuotaQuery,
} = messagesApi;
