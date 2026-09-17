import { api, unwrapData, unwrapList } from '../../app/api';
import { cleanParams } from '../../utils/params';

const PAGE_SIZE = 10;
const LIST = { type: 'Post', id: 'LIST' };

/** Applies `recipe` to a post in every cached feed page and in its detail cache. */
function patchPostEverywhere(dispatch, getState, postId, recipe) {
  const patches = api.util.selectCachedArgsForQuery(getState(), 'listPosts').map((args) =>
    dispatch(
      api.util.updateQueryData('listPosts', args, (draft) => {
        draft.pages.forEach((page) =>
          page.items.forEach((post) => post.id === postId && recipe(post)),
        );
      }),
    ),
  );
  patches.push(dispatch(api.util.updateQueryData('getPost', postId, (draft) => recipe(draft))));
  return patches;
}

function optimisticReaction(liked) {
  return async (postId, { dispatch, getState, queryFulfilled }) => {
    const patches = patchPostEverywhere(dispatch, getState, postId, (post) => {
      if (post.viewerHasLiked === liked) return;
      post.viewerHasLiked = liked;
      post.reactionCount = Math.max(0, post.reactionCount + (liked ? 1 : -1));
    });
    try {
      const { data } = await queryFulfilled;
      patchPostEverywhere(dispatch, getState, postId, (post) => {
        post.viewerHasLiked = data.liked;
        post.reactionCount = data.reactionCount;
      });
    } catch {
      // Roll back; the caller shows the error from the mutation promise.
      patches.forEach((patch) => patch.undo());
    }
  };
}

export const postsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listPosts: build.infiniteQuery({
      infiniteQueryOptions: {
        initialPageParam: 1,
        getNextPageParam: (lastPage, _allPages, lastPageParam) =>
          lastPage.meta.hasMore ? lastPageParam + 1 : undefined,
      },
      query: ({ queryArg, pageParam }) => ({
        url: '/posts',
        params: cleanParams({ limit: PAGE_SIZE, ...queryArg, page: pageParam }),
      }),
      transformResponse: unwrapList,
      providesTags: [LIST],
    }),
    getPost: build.query({
      query: (id) => `/posts/${id}`,
      transformResponse: unwrapData,
      providesTags: (_result, _error, id) => [{ type: 'Post', id }],
    }),
    createPost: build.mutation({
      query: (body) => ({ url: '/posts', method: 'POST', body }),
      transformResponse: unwrapData,
      invalidatesTags: (_result, _error, body) => [
        LIST,
        { type: 'Community', id: body.community },
        'Profile',
      ],
    }),
    updatePost: build.mutation({
      query: ({ id, ...body }) => ({ url: `/posts/${id}`, method: 'PATCH', body }),
      transformResponse: unwrapData,
      invalidatesTags: (_result, _error, { id }) => [LIST, { type: 'Post', id }],
    }),
    deletePost: build.mutation({
      query: ({ id, reason }) => ({
        url: `/posts/${id}`,
        method: 'DELETE',
        body: reason ? { reason } : undefined,
      }),
      transformResponse: unwrapData,
      invalidatesTags: (_result, _error, { id }) => [
        LIST,
        { type: 'Post', id },
        'Profile',
        { type: 'Community', id: 'LIST' },
      ],
    }),
    likePost: build.mutation({
      query: (id) => ({ url: `/posts/${id}/reactions`, method: 'PUT' }),
      transformResponse: unwrapData,
      onQueryStarted: optimisticReaction(true),
    }),
    unlikePost: build.mutation({
      query: (id) => ({ url: `/posts/${id}/reactions`, method: 'DELETE' }),
      transformResponse: unwrapData,
      onQueryStarted: optimisticReaction(false),
    }),
    uploadPostImage: build.mutation({
      query: (file) => {
        const body = new FormData();
        body.append('image', file);
        return { url: '/uploads/images', method: 'POST', body };
      },
      transformResponse: unwrapData,
    }),
    listComments: build.query({
      query: ({ postId, sort = 'oldest' }) => ({
        url: `/posts/${postId}/comments`,
        params: { limit: 50, sort },
      }),
      transformResponse: unwrapList,
      providesTags: (_result, _error, { postId }) => [{ type: 'Comment', id: postId }],
    }),
    createComment: build.mutation({
      query: ({ postId, ...body }) => ({ url: `/posts/${postId}/comments`, method: 'POST', body }),
      transformResponse: unwrapData,
      invalidatesTags: (_result, _error, { postId }) => [
        { type: 'Comment', id: postId },
        { type: 'Post', id: postId },
      ],
    }),
    updateComment: build.mutation({
      query: ({ id, content }) => ({ url: `/comments/${id}`, method: 'PATCH', body: { content } }),
      transformResponse: unwrapData,
      invalidatesTags: (_result, _error, { postId }) => [{ type: 'Comment', id: postId }],
    }),
    deleteComment: build.mutation({
      query: ({ id }) => ({ url: `/comments/${id}`, method: 'DELETE' }),
      transformResponse: unwrapData,
      invalidatesTags: (_result, _error, { postId }) => [
        { type: 'Comment', id: postId },
        { type: 'Post', id: postId },
      ],
    }),
    createReport: build.mutation({
      query: (body) => ({ url: '/reports', method: 'POST', body }),
      transformResponse: unwrapData,
      invalidatesTags: ['Report'],
    }),
  }),
});

export const {
  useListPostsInfiniteQuery,
  useGetPostQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
  useLikePostMutation,
  useUnlikePostMutation,
  useUploadPostImageMutation,
  useListCommentsQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useCreateReportMutation,
} = postsApi;
