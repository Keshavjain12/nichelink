import { Flag, MessageCircle, Pencil, Reply, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { LIMITS } from '../../constants/content';
import {
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useListCommentsQuery,
  useUpdateCommentMutation,
} from '../../features/posts/postsApi';
import { getErrorMessage } from '../../utils/errors';
import { cn } from '../../utils/misc';
import { Avatar } from '../common/Avatar';
import { UserBadges } from '../common/Badge';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/Dialog';
import { EmptyState, ErrorState, Skeleton } from '../common/Feedback';
import { Textarea } from '../common/Field';
import { RelativeTime } from '../common/Misc';
import ReportDialog from '../moderation/ReportDialog';

export function CommentComposer({ postId, parentId, onDone, autoFocus = false, placeholder = 'Add to the discussion…' }) {
  const [content, setContent] = useState('');
  const [createComment, { isLoading }] = useCreateCommentMutation();
  const trimmed = content.trim();

  const submit = async (event) => {
    event.preventDefault();
    if (!trimmed) return;
    try {
      await createComment({ postId, content: trimmed, parentId }).unwrap();
      setContent('');
      toast.success(parentId ? 'Reply posted' : 'Comment added');
      onDone?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor={`composer-${parentId ?? 'root'}`} className="sr-only">
        {parentId ? 'Write a reply' : 'Write a comment'}
      </label>
      <Textarea
        id={`composer-${parentId ?? 'root'}`}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) submit(event);
        }}
        placeholder={placeholder}
        maxLength={LIMITS.COMMENT_MAX}
        autoFocus={autoFocus}
        className="min-h-20"
      />
      <div className="flex items-center justify-end gap-2">
        {onDone && (
          <Button variant="ghost" size="sm" onClick={onDone}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" loading={isLoading} disabled={!trimmed}>
          {parentId ? 'Reply' : 'Comment'}
        </Button>
      </div>
    </form>
  );
}

function CommentItem({ comment, postId }) {
  const location = useLocation();
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [updateComment, { isLoading: saving }] = useUpdateCommentMutation();
  const [deleteComment, { isLoading: deleting }] = useDeleteCommentMutation();
  const anchor = `comment-${comment.id}`;
  const highlighted = location.hash === `#${anchor}`;

  useEffect(() => {
    if (highlighted) document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlighted, anchor]);

  const save = async () => {
    try {
      await updateComment({ id: comment.id, postId, content: draft.trim() }).unwrap();
      setEditing(false);
      toast.success('Comment updated');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <li id={anchor} className="scroll-mt-24">
      <div className={cn('flex gap-3 rounded-xl p-2 transition-colors', highlighted && 'bg-brand-50 dark:bg-brand-500/10')}>
        {comment.isDeleted ? (
          <span className="size-8 shrink-0 rounded-full bg-surface-muted" aria-hidden="true" />
        ) : (
          <Link to={`/profile/${comment.author.username}`} tabIndex={-1} aria-hidden="true">
            <Avatar user={comment.author} size="sm" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          {comment.isDeleted ? (
            <p className="py-1.5 text-sm text-fg-subtle italic">This comment was deleted.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
                <Link to={`/profile/${comment.author.username}`} className="font-medium text-fg hover:underline">
                  {comment.author.name}
                </Link>
                <UserBadges user={comment.author} />
                <span className="text-fg-subtle" aria-hidden="true">·</span>
                <RelativeTime value={comment.createdAt} className="text-xs text-fg-subtle" />
                {comment.editedAt && <span className="text-xs text-fg-subtle">(edited)</span>}
              </div>

              {editing ? (
                <div className="mt-2 space-y-2">
                  <label htmlFor={`edit-${comment.id}`} className="sr-only">Edit comment</label>
                  <Textarea id={`edit-${comment.id}`} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={LIMITS.COMMENT_MAX} autoFocus />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                    <Button size="sm" onClick={save} loading={saving} disabled={!draft.trim()}>Save</Button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-sm leading-6 whitespace-pre-wrap break-words text-fg">{comment.content}</p>
              )}

              {!editing && (
                <div className="mt-1 -ml-2 flex flex-wrap items-center gap-0.5">
                  {comment.permissions.canReply && (
                    <Button variant="ghost" size="xs" leftIcon={Reply} onClick={() => setReplying((value) => !value)} aria-expanded={replying}>
                      Reply
                    </Button>
                  )}
                  {comment.permissions.canEdit && (
                    <Button variant="ghost" size="xs" leftIcon={Pencil} onClick={() => { setDraft(comment.content); setEditing(true); }}>
                      Edit
                    </Button>
                  )}
                  {comment.permissions.canDelete && (
                    <Button variant="ghost" size="xs" leftIcon={Trash2} onClick={() => setConfirmDelete(true)}>
                      Delete
                    </Button>
                  )}
                  {comment.permissions.canReport && (
                    <Button variant="ghost" size="xs" leftIcon={Flag} onClick={() => setReporting(true)}>
                      Report
                    </Button>
                  )}
                </div>
              )}
            </>
          )}

          {replying && (
            <div className="mt-2">
              <CommentComposer
                postId={postId}
                parentId={comment.id}
                autoFocus
                placeholder={`Reply to ${comment.author?.name ?? 'this comment'}…`}
                onDone={() => setReplying(false)}
              />
            </div>
          )}
        </div>
      </div>

      {comment.replies.length > 0 && (
        <ul className="mt-1 ml-4 space-y-1 border-l-2 border-line pl-2 sm:ml-6 sm:pl-4">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} postId={postId} />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this comment?"
        description="Replies will stay visible under a placeholder."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={async () => {
          try {
            await deleteComment({ id: comment.id, postId }).unwrap();
            toast.success('Comment deleted');
            setConfirmDelete(false);
          } catch (error) {
            toast.error(getErrorMessage(error));
          }
        }}
      />
      {reporting && <ReportDialog open onClose={() => setReporting(false)} targetType="Comment" targetId={comment.id} />}
    </li>
  );
}

export default function CommentThread({ postId }) {
  const { data, isLoading, error, refetch } = useListCommentsQuery({ postId });

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (error) return <ErrorState error={error} title="Couldn't load comments" onRetry={refetch} />;
  if (data.items.length === 0) {
    return <EmptyState icon={MessageCircle} title="No comments yet" description="Share your experience or ask a follow-up question." className="py-8" />;
  }

  return (
    <ul className="space-y-1">
      {data.items.map((comment) => (
        <CommentItem key={comment.id} comment={comment} postId={postId} />
      ))}
    </ul>
  );
}
