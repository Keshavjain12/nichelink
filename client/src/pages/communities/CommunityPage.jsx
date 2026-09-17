import {
  Calendar,
  Clock,
  Flame,
  Lock,
  LogIn,
  MessageSquare,
  PenSquare,
  ScrollText,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Avatar } from '../../components/common/Avatar';
import { Badge, UserBadges } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card, CardHeader } from '../../components/common/Card';
import { EmptyState, ErrorState, Skeleton } from '../../components/common/Feedback';
import { Pagination, Tag, UpgradeCallout } from '../../components/common/Misc';
import { SegmentedControl, Tabs } from '../../components/common/Tabs';
import { CommunityIcon } from '../../components/community/CommunityCard';
import JoinButton from '../../components/community/JoinButton';
import PostList from '../../components/post/PostList';
import {
  useGetCommunityMembersQuery,
  useGetCommunityQuery,
} from '../../features/communities/communitiesApi';
import { useDocumentTitle } from '../../hooks/common';
import { formatCompactNumber, formatDate } from '../../utils/format';

const SORTS = [
  { value: 'latest', label: 'Latest', icon: Clock },
  { value: 'trending', label: 'Trending', icon: Flame },
  { value: 'top', label: 'Top', icon: TrendingUp },
];

function CommunityHeaderSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-28 rounded-none" />
      <div className="space-y-3 p-6">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </Card>
  );
}

function AboutPanel({ community }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <Card className="p-6">
        <h2 className="text-sm font-semibold">About this community</h2>
        <p className="mt-2 text-sm leading-6 whitespace-pre-line text-fg-muted">
          {community.description || community.tagline}
        </p>
        {community.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {community.tags.map((tag) => (
              <Tag key={tag}>#{tag}</Tag>
            ))}
          </div>
        )}
        <p className="mt-5 flex items-center gap-1.5 text-xs text-fg-subtle">
          <Calendar className="size-3.5" aria-hidden="true" /> Created{' '}
          {formatDate(community.createdAt)}
        </p>

        {community.rules.length > 0 && (
          <>
            <h2 className="mt-8 flex items-center gap-1.5 text-sm font-semibold">
              <ScrollText className="size-4" aria-hidden="true" /> Community rules
            </h2>
            <ol className="mt-3 space-y-3">
              {community.rules.map((rule, index) => (
                <li key={rule.title} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{rule.title}</p>
                    {rule.description && (
                      <p className="text-sm text-fg-muted">{rule.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </Card>
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-brand-500" aria-hidden="true" />
              Moderators
            </span>
          }
        />
        <ul className="space-y-1 p-3">
          {community.moderators.map((moderator) => (
            <li key={moderator.id}>
              <Link
                to={`/profile/${moderator.username}`}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-hover"
              >
                <Avatar user={moderator} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{moderator.name}</p>
                  <p className="text-xs text-fg-subtle capitalize">{moderator.communityRole}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function MembersPanel({ slug, isAuthenticated }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useGetCommunityMembersQuery(
    { slug, page },
    { skip: !isAuthenticated },
  );

  if (!isAuthenticated) {
    return (
      <EmptyState
        icon={Users}
        title="Sign in to see members"
        action={
          <Button as={Link} to={`/login?redirect=/communities/${slug}`} leftIcon={LogIn}>
            Sign in
          </Button>
        }
      />
    );
  }
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-2xl" />
          ))}
        {data?.items.map((member) => (
          <Card key={member.id} className="p-4">
            <Link to={`/profile/${member.username}`} className="flex items-center gap-3">
              <Avatar user={member} showPresence />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                  {member.name} <UserBadges user={member} />
                </p>
                <p className="truncate text-xs text-fg-subtle">
                  {member.headline || `@${member.username}`}
                </p>
              </div>
              {member.communityRole !== 'member' && (
                <Badge variant="brand" className="capitalize">
                  {member.communityRole}
                </Badge>
              )}
            </Link>
          </Card>
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-2">
        {page > 1 && (
          <Button variant="secondary" size="sm" onClick={() => setPage(page - 1)}>
            Previous
          </Button>
        )}
        {data?.meta.hasMore && (
          <Button variant="secondary" size="sm" onClick={() => setPage(page + 1)}>
            Next
          </Button>
        )}
      </div>
    </>
  );
}

export default function CommunityPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') ?? 'discussions';
  const [sort, setSort] = useState('latest');
  const { data: community, isLoading, error, refetch } = useGetCommunityQuery(slug);
  useDocumentTitle(community?.name ?? 'Community');

  if (isLoading) return <CommunityHeaderSkeleton />;
  if (error) {
    return (
      <ErrorState
        error={error}
        title={error.status === 404 ? 'Community not found' : 'Could not load this community'}
        onRetry={error.status === 404 ? undefined : refetch}
      />
    );
  }

  const { viewer } = community;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div
          className="h-24 sm:h-32"
          style={{
            background: `linear-gradient(120deg, ${community.accentColor} 0%, ${community.accentColor}99 55%, ${community.accentColor}33 100%)`,
          }}
          aria-hidden="true"
        />
        <div className="px-5 pb-5 sm:px-6">
          <div className="-mt-8 flex flex-col gap-4 sm:-mt-10 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <span className="rounded-2xl bg-surface p-1 shadow-card">
                <CommunityIcon community={community} size="lg" />
              </span>
              <div className="min-w-0 pb-1">
                <h1 className="text-2xl font-bold tracking-tight">{community.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-fg-subtle">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5" aria-hidden="true" />
                    {formatCompactNumber(community.memberCount)} members
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="size-3.5" aria-hidden="true" />
                    {formatCompactNumber(community.postCount)} discussions
                  </span>
                  {community.accessType === 'pro' && (
                    <Badge variant="pro" icon={Lock}>
                      Pro community
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
            <div className="flex gap-2">
              {viewer.canPost && (
                <Button
                  as={Link}
                  to={`/posts/new?community=${community.slug}`}
                  leftIcon={PenSquare}
                  size="sm"
                >
                  New post
                </Button>
              )}
              <JoinButton community={community} />
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-sm text-fg-muted">{community.tagline}</p>
        </div>
      </Card>

      <Tabs
        label="Community sections"
        value={tab}
        onChange={(value) =>
          setSearchParams(value === 'discussions' ? {} : { tab: value }, { replace: true })
        }
        tabs={[
          { value: 'discussions', label: 'Discussions' },
          { value: 'about', label: 'About' },
          { value: 'members', label: 'Members', count: community.memberCount },
        ]}
      />

      {tab === 'about' && <AboutPanel community={community} />}
      {tab === 'members' && (
        <MembersPanel slug={community.slug} isAuthenticated={viewer.isAuthenticated} />
      )}
      {tab === 'discussions' &&
        (viewer.canRead ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SegmentedControl
                label="Sort posts"
                options={SORTS}
                value={sort}
                onChange={setSort}
              />
              {viewer.isAuthenticated && viewer.isMember && !viewer.canPost && (
                <p className="text-xs text-fg-subtle">
                  Free members can read and react.{' '}
                  <Link
                    to="/pricing"
                    className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Upgrade to post
                  </Link>
                </p>
              )}
            </div>
            <PostList
              params={{ community: community.slug, sort }}
              showCommunity={false}
              emptyState={
                <EmptyState
                  icon={MessageSquare}
                  title="No discussions yet"
                  description={
                    viewer.canPost
                      ? 'Kick things off with a question or a lesson learned.'
                      : 'Discussions will appear here as members post.'
                  }
                  action={
                    viewer.canPost && (
                      <Button
                        as={Link}
                        to={`/posts/new?community=${community.slug}`}
                        leftIcon={PenSquare}
                      >
                        Start the first discussion
                      </Button>
                    )
                  }
                />
              }
            />
          </div>
        ) : viewer.isAuthenticated ? (
          <UpgradeCallout
            title="This is a Pro community"
            description="Discussions here are reserved for Pro members. Upgrade to read, post and connect with this group."
          />
        ) : (
          <EmptyState
            icon={Lock}
            title="Sign in with a Pro account to read this community"
            action={
              <Button
                as={Link}
                to={`/login?redirect=/communities/${community.slug}`}
                leftIcon={LogIn}
              >
                Sign in
              </Button>
            }
          />
        ))}
    </div>
  );
}
