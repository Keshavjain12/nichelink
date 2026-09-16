import { LogIn, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useListPostsInfiniteQuery } from '../../features/posts/postsApi';
import { Button } from '../common/Button';
import { EmptyState, ErrorState, InlineAlert } from '../common/Feedback';
import { LoadMore } from '../common/Misc';
import PostCard, { PostCardSkeleton } from './PostCard';

export default function PostList({ params, showCommunity = true, emptyState }) {
  const { data, error, isLoading, isFetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useListPostsInfiniteQuery(params);

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading posts">
        {Array.from({ length: 3 }, (_, index) => (
          <PostCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) return <ErrorState error={error} title="Couldn't load discussions" onRetry={refetch} />;

  const posts = data.pages.flatMap((page) => page.items);
  const previewOnly = data.pages[0]?.meta.previewOnly;

  if (posts.length === 0) {
    return (
      emptyState ?? (
        <EmptyState icon={MessageSquare} title="No discussions yet" description="Be the first to start a conversation here." />
      )
    );
  }

  return (
    <div className="space-y-4" aria-busy={isFetching}>
      {previewOnly && (
        <InlineAlert
          variant="info"
          title="You're viewing a preview"
          action={
            <Button as={Link} to="/register" size="sm" leftIcon={LogIn}>
              Join free
            </Button>
          }
        >
          Create a free account to read full discussions and join the conversation.
        </InlineAlert>
      )}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} showCommunity={showCommunity} preview={previewOnly} />
      ))}
      <LoadMore
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        endLabel={posts.length > 5 ? "You're all caught up" : null}
      />
    </div>
  );
}
