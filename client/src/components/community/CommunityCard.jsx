import { Lock, MessageSquare, Star, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCompactNumber } from '../../utils/format';
import { Badge } from '../common/Badge';
import { Card } from '../common/Card';
import { Skeleton } from '../common/Feedback';
import { StatPill } from '../common/Misc';
import JoinButton from './JoinButton';

export function CommunityIcon({ community, size = 'md' }) {
  const sizes = {
    sm: 'size-8 text-base rounded-lg',
    md: 'size-12 text-2xl rounded-xl',
    lg: 'size-16 text-4xl rounded-2xl',
  };
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${sizes[size]}`}
      style={{ backgroundColor: `${community.accentColor}1f` }}
      aria-hidden="true"
    >
      {community.icon}
    </span>
  );
}

export function CommunityCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex gap-3">
        <Skeleton className="size-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-4/5" />
    </Card>
  );
}

export default function CommunityCard({ community }) {
  return (
    <Card className="group relative flex h-full flex-col p-5 transition-all hover:border-line-strong hover:shadow-elevated">
      <div className="flex items-start gap-3">
        <CommunityIcon community={community} />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 font-semibold text-fg">
            <Link
              to={`/communities/${community.slug}`}
              className="truncate after:absolute after:inset-0 after:rounded-2xl"
            >
              {community.name}
            </Link>
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge>{community.category}</Badge>
            {community.accessType === 'pro' && (
              <Badge variant="pro" icon={Lock}>
                Pro
              </Badge>
            )}
            {community.isFeatured && (
              <Badge variant="brand" icon={Star}>
                Featured
              </Badge>
            )}
          </div>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 flex-1 text-sm text-fg-muted">{community.tagline}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex gap-3">
          <StatPill icon={Users}>{formatCompactNumber(community.memberCount)}</StatPill>
          <StatPill icon={MessageSquare}>{formatCompactNumber(community.postCount)}</StatPill>
        </div>
        <div className="relative z-10">
          <JoinButton community={community} size="xs" />
        </div>
      </div>
    </Card>
  );
}
