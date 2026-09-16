import { Flame, Sparkles, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useGetRecommendedCommunitiesQuery,
  useGetTrendingCommunitiesQuery,
} from '../../features/communities/communitiesApi';
import { useAuth } from '../../hooks/useAuth';
import { formatCompactNumber } from '../../utils/format';
import { Button } from '../common/Button';
import { Card, CardHeader } from '../common/Card';
import { Skeleton } from '../common/Feedback';
import { CommunityIcon } from './CommunityCard';
import JoinButton from './JoinButton';

function CommunityRows({ communities, isLoading, renderMeta }) {
  return (
    <ul className="space-y-1 p-3">
      {isLoading &&
        Array.from({ length: 4 }, (_, index) => (
          <li key={index} className="flex items-center gap-3 px-2 py-2">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-3 flex-1" />
          </li>
        ))}
      {communities?.map((community) => (
        <li key={community.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-hover">
          <CommunityIcon community={community} size="sm" />
          <div className="min-w-0 flex-1">
            <Link to={`/communities/${community.slug}`} className="block truncate text-sm font-medium text-fg hover:underline">
              {community.name}
            </Link>
            <p className="text-xs text-fg-subtle">{renderMeta(community)}</p>
          </div>
          {!community.viewer?.isMember && <JoinButton community={community} size="xs" />}
        </li>
      ))}
    </ul>
  );
}

export function TrendingCommunitiesCard() {
  const { data, isLoading } = useGetTrendingCommunitiesQuery();
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-1.5"><Flame className="size-4 text-orange-500" aria-hidden="true" />Trending this week</span>} />
      <CommunityRows
        communities={data}
        isLoading={isLoading}
        renderMeta={(community) =>
          community.recentPostCount
            ? `${community.recentPostCount} new ${community.recentPostCount === 1 ? 'post' : 'posts'}`
            : `${formatCompactNumber(community.memberCount)} members`
        }
      />
    </Card>
  );
}

export function RecommendedCommunitiesCard() {
  const { data, isLoading } = useGetRecommendedCommunitiesQuery();
  if (!isLoading && !data?.length) return null;
  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-1.5"><Sparkles className="size-4 text-brand-500" aria-hidden="true" />Recommended for you</span>}
        description="Based on your skills and interests"
      />
      <CommunityRows communities={data} isLoading={isLoading} renderMeta={(community) => `${formatCompactNumber(community.memberCount)} members`} />
    </Card>
  );
}

export function ProfileCompletionCard() {
  const { user } = useAuth();
  if (!user || user.profileCompletion >= 100) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-fg">
        <UserRound className="size-4 text-brand-500" aria-hidden="true" />
        Complete your profile
      </div>
      <p className="mt-1 text-xs text-fg-subtle">Members with complete profiles get more replies and better recommendations.</p>
      <div className="mt-4 flex items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuenow={user.profileCompletion}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completion"
        >
          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500" style={{ width: `${user.profileCompletion}%` }} />
        </div>
        <span className="text-xs font-semibold text-fg">{user.profileCompletion}%</span>
      </div>
      <Button as={Link} to="/settings/profile" variant="secondary" size="sm" className="mt-4 w-full">
        Finish profile
      </Button>
    </Card>
  );
}
