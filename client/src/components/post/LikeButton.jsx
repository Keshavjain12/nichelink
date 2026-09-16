import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PERMISSIONS } from '../../constants/app';
import { useLikePostMutation, useUnlikePostMutation } from '../../features/posts/postsApi';
import { useAuth } from '../../hooks/useAuth';
import { getErrorMessage } from '../../utils/errors';
import { formatCompactNumber } from '../../utils/format';
import { cn } from '../../utils/misc';

const baseClass =
  'relative z-10 inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors';

export default function LikeButton({ post }) {
  const { isAuthenticated, can } = useAuth();
  const [like] = useLikePostMutation();
  const [unlike] = useUnlikePostMutation();
  const liked = post.viewerHasLiked;
  const label = `${formatCompactNumber(post.reactionCount)}`;

  if (!isAuthenticated || !can(PERMISSIONS.REACTION_TOGGLE)) {
    return (
      <Link to="/login" className={cn(baseClass, 'text-fg-subtle hover:bg-surface-hover')} aria-label={`${label} likes. Sign in to like`}>
        <Heart className="size-4" aria-hidden="true" />
        {label}
      </Link>
    );
  }

  const toggle = async () => {
    try {
      await (liked ? unlike(post.id) : like(post.id)).unwrap();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update your reaction'));
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? `Unlike. ${label} likes` : `Like. ${label} likes`}
      className={cn(
        baseClass,
        liked ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10' : 'text-fg-subtle hover:bg-surface-hover hover:text-fg',
      )}
    >
      <Heart className={cn('size-4 transition-transform', liked && 'scale-110 fill-current')} aria-hidden="true" />
      {label}
    </button>
  );
}
