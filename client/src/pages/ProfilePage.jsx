import { Briefcase, Calendar, Ellipsis, Flag, Globe, MapPin, MessagesSquare, Pencil, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
import { UserBadges } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState, ErrorState, Skeleton } from '../components/common/Feedback';
import { Menu, MenuItem } from '../components/common/Menu';
import { LoadMore, Tag } from '../components/common/Misc';
import { Tabs } from '../components/common/Tabs';
import CommunityCard, { CommunityCardSkeleton } from '../components/community/CommunityCard';
import ReportDialog from '../components/moderation/ReportDialog';
import PostList from '../components/post/PostList';
import ProjectCard from '../components/projects/ProjectCard';
import { useListProjectsInfiniteQuery } from '../features/projects/projectsApi';
import { useGetProfileCommunitiesQuery, useGetProfileQuery } from '../features/users/usersApi';
import { useDocumentTitle } from '../hooks/common';
import { formatDate } from '../utils/format';

function ProfileCommunities({ username }) {
  const { data, isLoading, error, refetch } = useGetProfileCommunitiesQuery(username);
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!isLoading && data.length === 0) return <EmptyState icon={Users} title="Not a member of any communities yet" />;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {isLoading && [0, 1].map((index) => <CommunityCardSkeleton key={index} />)}
      {data?.map((community) => <CommunityCard key={community.id} community={community} />)}
    </div>
  );
}

function ProfileProjects({ userId }) {
  const { data, isLoading, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useListProjectsInfiniteQuery({ author: userId, status: 'all' });
  const projects = (data?.pages ?? []).flatMap((page) => page.items);
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!isLoading && projects.length === 0) return <EmptyState icon={Briefcase} title="No collaboration requests yet" />;
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {isLoading && [0, 1].map((index) => <Skeleton key={index} className="h-48 rounded-2xl" />)}
        {projects.map((project) => <ProjectCard key={project.id} project={project} />)}
      </div>
      <LoadMore hasNextPage={hasNextPage} fetchNextPage={fetchNextPage} isFetchingNextPage={isFetchingNextPage} />
    </>
  );
}

export default function ProfilePage() {
  const { username } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') ?? 'posts';
  const [reporting, setReporting] = useState(false);
  const { data: profile, isLoading, error, refetch } = useGetProfileQuery(username);
  useDocumentTitle(profile?.name ?? 'Profile');

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex gap-5">
          <Skeleton className="size-24 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </Card>
    );
  }
  if (error) return <ErrorState error={error} title={error.status === 404 ? 'Member not found' : 'Could not load profile'} onRetry={error.status === 404 ? undefined : refetch} />;

  const website = profile.website?.replace(/^https?:\/\//, '').replace(/\/$/, '');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="overflow-hidden">
        <div className="h-24 bg-linear-to-r from-brand-500/80 via-violet-500/70 to-fuchsia-500/60 sm:h-32" aria-hidden="true" />
        <div className="px-5 pb-6 sm:px-7">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <span className="w-fit rounded-full bg-surface p-1">
              <Avatar user={profile} size="xl" showPresence={!profile.isSelf} />
            </span>
            <div className="flex gap-2">
              {profile.isSelf ? (
                <Button as={Link} to="/settings/profile" variant="secondary" leftIcon={Pencil}>Edit profile</Button>
              ) : (
                <>
                  <Button as={Link} to={`/messages?to=${profile.id}`} leftIcon={MessagesSquare}>Message</Button>
                  <Menu
                    label="More actions"
                    trigger={(props) => (
                      <Button variant="secondary" size="icon" {...props}>
                        <Ellipsis className="size-4" aria-hidden="true" />
                      </Button>
                    )}
                  >
                    <MenuItem icon={Flag} danger onClick={() => setReporting(true)}>Report member</MenuItem>
                  </Menu>
                </>
              )}
            </div>
          </div>

          <div className="mt-4">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
              {profile.name} <UserBadges user={profile} />
            </h1>
            <p className="text-sm text-fg-subtle">@{profile.username}</p>
            {profile.headline && <p className="mt-2 text-base text-fg">{profile.headline}</p>}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-fg-subtle">
              {profile.location && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden="true" />{profile.location}</span>}
              {website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 text-brand-600 hover:underline dark:text-brand-400">
                  <Globe className="size-4" aria-hidden="true" />{website}
                </a>
              )}
              <span className="inline-flex items-center gap-1.5"><Calendar className="size-4" aria-hidden="true" />Joined {formatDate(profile.createdAt, { month: 'long', year: 'numeric' })}</span>
            </div>
            {profile.bio && <p className="mt-4 max-w-2xl text-sm leading-6 whitespace-pre-line text-fg-muted">{profile.bio}</p>}

            <dl className="mt-5 flex gap-6">
              {[
                ['Posts', profile.stats.postCount],
                ['Communities', profile.stats.communityCount],
                ['Projects', profile.stats.projectCount],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-fg-subtle">{label}</dt>
                  <dd className="text-lg font-semibold">{value}</dd>
                </div>
              ))}
            </dl>

            {(profile.skills.length > 0 || profile.interests.length > 0) && (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {profile.skills.length > 0 && (
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Skills</h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">{profile.skills.map((skill) => <Tag key={skill}>{skill}</Tag>)}</div>
                  </div>
                )}
                {profile.interests.length > 0 && (
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Interests</h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">{profile.interests.map((interest) => <Tag key={interest}>#{interest}</Tag>)}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      <Tabs
        label="Profile sections"
        value={tab}
        onChange={(value) => setSearchParams(value === 'posts' ? {} : { tab: value }, { replace: true })}
        tabs={[
          { value: 'posts', label: 'Posts', count: profile.stats.postCount },
          { value: 'communities', label: 'Communities', count: profile.stats.communityCount },
          { value: 'projects', label: 'Projects', count: profile.stats.projectCount },
        ]}
      />

      {tab === 'posts' && <PostList params={{ author: profile.username }} emptyState={<EmptyState title="No posts yet" description={profile.isSelf ? 'Your discussions will appear here.' : `${profile.name.split(' ')[0]} hasn't posted yet.`} />} />}
      {tab === 'communities' && <ProfileCommunities username={profile.username} />}
      {tab === 'projects' && <ProfileProjects userId={profile.id} />}

      {reporting && <ReportDialog open onClose={() => setReporting(false)} targetType="User" targetId={profile.id} />}
    </div>
  );
}
