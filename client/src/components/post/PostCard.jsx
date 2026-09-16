import { Ellipsis, Flag, Link2, MessageCircle, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { copyPostLink } from '../../utils/clipboard';
import { formatCompactNumber } from '../../utils/format';
import { Avatar } from '../common/Avatar';
import { UserBadges } from '../common/Badge';
import { Card } from '../common/Card';
import { Skeleton } from '../common/Feedback';
import { Menu, MenuItem } from '../common/Menu';
import { RelativeTime, Tag } from '../common/Misc';
import ReportDialog from '../moderation/ReportDialog';
import LikeButton from './LikeButton';

export function PostCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="mt-4 h-5 w-3/4" />
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-5/6" />
    </Card>
  );
}

export function PostMeta({ post, showCommunity = true }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
      {post.author ? (
        <Link to={`/profile/${post.author.username}`} className="relative z-10 font-medium text-fg hover:underline">
          {post.author.name}
        </Link>
      ) : (
        <span className="text-fg-subtle">Deleted member</span>
      )}
      <UserBadges user={post.author} />
      {showCommunity && post.community && (
        <>
          <span className="text-fg-subtle" aria-hidden="true">in</span>
          <Link to={`/communities/${post.community.slug}`} className="relative z-10 font-medium text-fg-muted hover:text-fg hover:underline">
            {post.community.icon} {post.community.name}
          </Link>
        </>
      )}
      <span className="text-fg-subtle" aria-hidden="true">·</span>
      <RelativeTime value={post.createdAt} className="text-fg-subtle" />
      {post.editedAt && <span className="text-xs text-fg-subtle">(edited)</span>}
    </div>
  );
}

export default function PostCard({ post, showCommunity = true, preview = false }) {
  const { user, isAuthenticated } = useAuth();
  const [reporting, setReporting] = useState(false);
  const isAuthor = user?.id === post.author?.id;
  const href = preview ? `/login?redirect=/posts/${post.id}` : `/posts/${post.id}`;

  return (
    <Card as="article" className="group relative p-5 transition-colors hover:border-line-strong">
      <div className="flex items-start gap-3">
        <Link to={post.author ? `/profile/${post.author.username}` : '#'} className="relative z-10 shrink-0" tabIndex={-1} aria-hidden="true">
          <Avatar user={post.author} size="sm" />
        </Link>
        <div className="min-w-0 flex-1">
          <PostMeta post={post} showCommunity={showCommunity} />
        </div>
        {isAuthenticated && !preview && (
          <Menu
            label="Post actions"
            className="relative z-10 -mt-1 -mr-2"
            trigger={(props) => (
              <button type="button" className="inline-flex size-8 items-center justify-center rounded-lg text-fg-subtle hover:bg-surface-hover hover:text-fg" {...props}>
                <Ellipsis className="size-4" aria-hidden="true" />
              </button>
            )}
          >
            <MenuItem icon={Link2} onClick={() => copyPostLink(post.id)}>Copy link</MenuItem>
            {isAuthor && <MenuItem as={Link} to={`/posts/${post.id}/edit`} icon={Pencil}>Edit post</MenuItem>}
            {!isAuthor && <MenuItem icon={Flag} danger onClick={() => setReporting(true)}>Report post</MenuItem>}
          </Menu>
        )}
      </div>

      <h2 className="mt-3 text-lg font-semibold leading-snug tracking-tight text-fg">
        <Link to={href} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
          {post.title}
        </Link>
      </h2>
      {post.excerpt && <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-fg-muted">{post.excerpt}</p>}

      {post.images?.[0] && (
        <img
          src={post.images[0].url}
          alt=""
          loading="lazy"
          className="mt-3 aspect-video w-full rounded-xl border border-line object-cover"
        />
      )}

      {post.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <Tag key={tag}>#{tag}</Tag>
          ))}
        </div>
      )}

      {!preview && (
        <div className="mt-3 -ml-2.5 flex items-center gap-1">
          <LikeButton post={post} />
          <Link
            to={`/posts/${post.id}#comments`}
            className="relative z-10 inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-fg-subtle hover:bg-surface-hover hover:text-fg"
            aria-label={`${post.commentCount} comments`}
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            {formatCompactNumber(post.commentCount)}
          </Link>
        </div>
      )}

      {reporting && <ReportDialog open onClose={() => setReporting(false)} targetType="Post" targetId={post.id} />}
    </Card>
  );
}
