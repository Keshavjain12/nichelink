import { ArrowLeft, Ellipsis, Flag, Link2, MessageCircle, Pencil, ShieldAlert, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar } from '../../components/common/Avatar';
import { Card } from '../../components/common/Card';
import { ConfirmDialog } from '../../components/common/Dialog';
import { ErrorState, InlineAlert, Skeleton } from '../../components/common/Feedback';
import { TextareaField } from '../../components/common/Field';
import { Menu, MenuItem } from '../../components/common/Menu';
import { RichTextContent, Tag, UpgradeCallout } from '../../components/common/Misc';
import CommentThread, { CommentComposer } from '../../components/comments/CommentThread';
import ReportDialog from '../../components/moderation/ReportDialog';
import LikeButton from '../../components/post/LikeButton';
import { PostMeta } from '../../components/post/PostCard';
import { copyPostLink } from '../../utils/clipboard';
import { useDeletePostMutation, useGetPostQuery } from '../../features/posts/postsApi';
import { useDocumentTitle } from '../../hooks/common';
import { useAuth } from '../../hooks/useAuth';
import { getErrorCode, getErrorMessage } from '../../utils/errors';

function PostSkeleton() {
  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-7 w-3/4" />
      {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-3 w-full" />)}
    </Card>
  );
}

export default function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: post, isLoading, error, refetch } = useGetPostQuery(id);
  const [deletePost, { isLoading: deleting }] = useDeletePostMutation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removalReason, setRemovalReason] = useState('');
  const [reporting, setReporting] = useState(false);
  useDocumentTitle(post?.title ?? 'Discussion');

  if (isLoading) return <div className="mx-auto max-w-3xl"><PostSkeleton /></div>;

  if (error) {
    if (getErrorCode(error) === 'PRO_REQUIRED') {
      return (
        <div className="mx-auto max-w-3xl">
          <UpgradeCallout title="This discussion is in a Pro community" description={getErrorMessage(error)} />
        </div>
      );
    }
    return <ErrorState error={error} title={error.status === 404 ? 'This discussion no longer exists' : 'Could not load this discussion'} onRetry={error.status === 404 ? undefined : refetch} />;
  }

  const { permissions } = post;
  const isAuthor = user?.id === post.author?.id;
  const moderatorRemoval = permissions.canDelete && !isAuthor;

  const handleDelete = async () => {
    try {
      await deletePost({ id: post.id, reason: moderatorRemoval ? removalReason.trim() || undefined : undefined }).unwrap();
      toast.success(moderatorRemoval ? 'Post removed' : 'Post deleted');
      navigate(post.community ? `/communities/${post.community.slug}` : '/feed', { replace: true });
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to={post.community ? `/communities/${post.community.slug}` : '/feed'}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {post.community ? `Back to ${post.community.name}` : 'Back to feed'}
      </Link>

      <Card as="article" className="p-5 sm:p-7">
        {post.moderation && (
          <InlineAlert variant="danger" title="This post was removed by a moderator" className="mb-5">
            {post.moderation.reason}
          </InlineAlert>
        )}

        <div className="flex items-start gap-3">
          <Avatar user={post.author} />
          <div className="min-w-0 flex-1 pt-0.5">
            <PostMeta post={post} />
            {post.author?.headline && <p className="mt-0.5 truncate text-xs text-fg-subtle">{post.author.headline}</p>}
          </div>
          <Menu
            label="Post actions"
            trigger={(props) => (
              <button type="button" className="inline-flex size-9 items-center justify-center rounded-lg text-fg-subtle hover:bg-surface-hover hover:text-fg" {...props}>
                <Ellipsis className="size-5" aria-hidden="true" />
              </button>
            )}
          >
            <MenuItem icon={Link2} onClick={() => copyPostLink(post.id)}>Copy link</MenuItem>
            {permissions.canEdit && <MenuItem as={Link} to={`/posts/${post.id}/edit`} icon={Pencil}>Edit post</MenuItem>}
            {permissions.canDelete && (
              <MenuItem icon={moderatorRemoval ? ShieldAlert : Trash2} danger onClick={() => setConfirmDelete(true)}>
                {moderatorRemoval ? 'Remove as moderator' : 'Delete post'}
              </MenuItem>
            )}
            {permissions.canReport && <MenuItem icon={Flag} danger onClick={() => setReporting(true)}>Report post</MenuItem>}
          </Menu>
        </div>

        <h1 className="mt-5 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{post.title}</h1>
        {post.content && <RichTextContent html={post.content} className="mt-5" />}

        {post.images.length > 0 && (
          <div className={`mt-6 grid gap-3 ${post.images.length > 1 ? 'sm:grid-cols-2' : ''}`}>
            {post.images.map((image) => (
              <a key={image.publicId} href={image.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-line">
                <img src={image.url} alt="" loading="lazy" className="w-full object-cover" />
              </a>
            ))}
          </div>
        )}

        {post.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => <Tag key={tag}>#{tag}</Tag>)}
          </div>
        )}

        <div className="mt-6 -ml-2.5 flex items-center gap-1 border-t border-line pt-4">
          <LikeButton post={post} />
          <a href="#comments" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-fg-subtle hover:bg-surface-hover hover:text-fg">
            <MessageCircle className="size-4" aria-hidden="true" />
            {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
          </a>
        </div>
      </Card>

      <section id="comments" aria-labelledby="comments-heading" className="scroll-mt-20">
        <Card className="p-5 sm:p-7">
          <h2 id="comments-heading" className="text-lg font-semibold">Discussion</h2>
          <div className="mt-4">
            {permissions.canComment ? (
              <CommentComposer postId={post.id} />
            ) : (
              post.status === 'published' && (
                <UpgradeCallout compact title="Want to reply?" description="Commenting is part of NicheLink Pro." />
              )
            )}
          </div>
          <div className="mt-6">
            <CommentThread postId={post.id} />
          </div>
        </Card>
      </section>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={moderatorRemoval ? 'Remove this post?' : 'Delete this post?'}
        description={
          moderatorRemoval
            ? 'The author will be notified. The post stays visible to moderators for review.'
            : 'This permanently removes your post and its images from the community.'
        }
        confirmLabel={moderatorRemoval ? 'Remove post' : 'Delete post'}
        loading={deleting}
        onConfirm={handleDelete}
      >
        {moderatorRemoval && (
          <TextareaField
            id="removal-reason"
            label="Reason shared with the author"
            value={removalReason}
            maxLength={300}
            onChange={(event) => setRemovalReason(event.target.value)}
            placeholder="e.g. Off-topic for this community"
          />
        )}
      </ConfirmDialog>
      {reporting && <ReportDialog open onClose={() => setReporting(false)} targetType="Post" targetId={post.id} />}
    </div>
  );
}
