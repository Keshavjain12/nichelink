import { Clock, Compass, Flame, PenSquare, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/Feedback';
import { UpgradeCallout } from '../components/common/Misc';
import { SegmentedControl } from '../components/common/Tabs';
import {
  ProfileCompletionCard,
  RecommendedCommunitiesCard,
  TrendingCommunitiesCard,
} from '../components/community/CommunityWidgets';
import PostList from '../components/post/PostList';
import { PERMISSIONS, STORAGE_KEYS } from '../constants/app';
import { useDocumentTitle } from '../hooks/common';
import { useAuth } from '../hooks/useAuth';
import { readStorage, writeStorage } from '../utils/misc';

const SORTS = [
  { value: 'latest', label: 'Latest', icon: Clock },
  { value: 'trending', label: 'Trending', icon: Flame },
  { value: 'top', label: 'Top', icon: TrendingUp },
];

const SCOPES = [
  { value: 'all', label: 'All communities' },
  { value: 'joined', label: 'My communities' },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function FeedPage() {
  useDocumentTitle('Home');
  const { user, can } = useAuth();
  const [sort, setSort] = useState(() => readStorage(STORAGE_KEYS.FEED_SORT, 'latest'));
  const [scope, setScope] = useState('all');
  const canPost = can(PERMISSIONS.POST_CREATE);

  const changeSort = (value) => {
    setSort(value);
    writeStorage(STORAGE_KEYS.FEED_SORT, value);
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting()}, {user.name.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">Here's what your niches are talking about.</p>
        </div>

        {canPost ? (
          <Card className="flex items-center gap-3 p-3">
            <Avatar user={user} size="sm" />
            <Link
              to="/posts/new"
              className="flex h-10 flex-1 items-center rounded-lg bg-surface-muted px-4 text-sm text-fg-subtle transition-colors hover:bg-surface-hover"
            >
              Start a discussion…
            </Link>
            <Button as={Link} to="/posts/new" size="sm" leftIcon={PenSquare} className="max-sm:hidden">
              Post
            </Button>
          </Card>
        ) : (
          <UpgradeCallout
            compact
            title="Ready to join the conversation?"
            description="Free members can read and react. Upgrade to Pro to publish posts, comment and message without limits."
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl label="Feed scope" options={SCOPES} value={scope} onChange={setScope} />
          <SegmentedControl label="Sort posts" options={SORTS} value={sort} onChange={changeSort} />
        </div>

        <PostList
          params={{ sort, scope }}
          emptyState={
            <EmptyState
              icon={Compass}
              title={scope === 'joined' ? 'Your communities are quiet' : 'No discussions yet'}
              description={
                scope === 'joined'
                  ? 'Join a few more communities to fill your feed with conversations you care about.'
                  : 'Check back soon — new discussions appear here as members post.'
              }
              action={
                <Button as={Link} to="/communities" variant="secondary">
                  Discover communities
                </Button>
              }
            />
          }
        />
      </div>

      <aside className="hidden space-y-4 xl:block" aria-label="Suggestions">
        <ProfileCompletionCard />
        <TrendingCommunitiesCard />
        <RecommendedCommunitiesCard />
      </aside>
    </div>
  );
}
