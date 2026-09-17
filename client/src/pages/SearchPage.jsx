import { ArrowRight, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
import { UserBadges } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState, ErrorState, InlineAlert, Skeleton } from '../components/common/Feedback';
import { Input } from '../components/common/Field';
import { PageHeader } from '../components/common/Misc';
import { Tabs } from '../components/common/Tabs';
import CommunityCard from '../components/community/CommunityCard';
import PostCard from '../components/post/PostCard';
import ProjectCard from '../components/projects/ProjectCard';
import { useSearchQuery } from '../features/users/usersApi';
import { useDocumentTitle } from '../hooks/common';
import { useAuth } from '../hooks/useAuth';

const TYPES = [
  { value: 'all', label: 'All' },
  { value: 'communities', label: 'Communities' },
  { value: 'users', label: 'People' },
  { value: 'posts', label: 'Posts' },
  { value: 'projects', label: 'Projects' },
];

function PersonRow({ person }) {
  return (
    <Card className="p-4">
      <Link to={`/profile/${person.username}`} className="flex items-center gap-3">
        <Avatar user={person} />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            {person.name} <UserBadges user={person} />
          </span>
          <span className="block truncate text-xs text-fg-subtle">
            @{person.username}
            {person.headline ? ` · ${person.headline}` : ''}
          </span>
        </span>
      </Link>
    </Card>
  );
}

function ResultItems({ type, items }) {
  if (type === 'communities')
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <CommunityCard key={item.id} community={item} />
        ))}
      </div>
    );
  if (type === 'users')
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <PersonRow key={item.id} person={item} />
        ))}
      </div>
    );
  if (type === 'posts')
    return (
      <div className="space-y-4">
        {items.map((item) => (
          <PostCard key={item.id} post={item} />
        ))}
      </div>
    );
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <ProjectCard key={item.id} project={item} />
      ))}
    </div>
  );
}

export default function SearchPage() {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const type = isAuthenticated ? (searchParams.get('type') ?? 'all') : 'communities';
  const page = Number(searchParams.get('page') ?? 1);
  const [input, setInput] = useState(q);
  const [syncedQuery, setSyncedQuery] = useState(q);
  useDocumentTitle(q ? `Search: ${q}` : 'Search');

  // Re-sync the box when the URL query changes (back/forward, suggestion click)
  // by adjusting state during render rather than in an effect.
  if (syncedQuery !== q) {
    setSyncedQuery(q);
    setInput(q);
  }

  const { data, isFetching, error, refetch } = useSearchQuery({ q, type, page }, { skip: !q });
  const update = (changes) =>
    setSearchParams(
      Object.fromEntries(
        Object.entries({ q, type, ...changes }).filter(([, value]) => value && value !== 1),
      ),
    );

  const sections = data ? Object.entries(data) : [];
  const totalResults = sections.reduce((sum, [, result]) => sum + result.items.length, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Search"
        description="Find communities, people, discussions and projects."
      />
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: input.trim(), page: 1 });
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <label htmlFor="search-page-input" className="sr-only">
            Search
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden="true"
          />
          <Input
            id="search-page-input"
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Search NicheLink"
            className="h-11 pl-9"
          />
        </div>
        <Button type="submit" size="lg" className="h-11">
          Search
        </Button>
      </form>

      {isAuthenticated ? (
        <Tabs
          label="Result type"
          value={type}
          onChange={(value) => update({ type: value, page: 1 })}
          tabs={TYPES}
        />
      ) : (
        <InlineAlert
          variant="info"
          action={
            <Button as={Link} to="/register" size="sm">
              Join free
            </Button>
          }
        >
          Guests can search communities. Sign in to search people, posts and projects.
        </InlineAlert>
      )}

      {!q && (
        <EmptyState
          icon={Search}
          title="Start typing to search"
          description="Try “stripe”, “kubernetes” or “technical writing”."
        />
      )}
      {error && <ErrorState error={error} onRetry={refetch} />}
      {q && isFetching && !data && (
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
      )}

      {data && totalResults === 0 && (
        <EmptyState
          icon={Search}
          title={`No results for “${q}”`}
          description="Check the spelling or try a broader term."
        />
      )}

      {data && totalResults > 0 && (
        <div className="space-y-10" aria-busy={isFetching}>
          {sections
            .filter(([, result]) => result.items.length > 0)
            .map(([sectionType, result]) => (
              <section key={sectionType} aria-labelledby={`results-${sectionType}`}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 id={`results-${sectionType}`} className="text-sm font-semibold text-fg">
                    {TYPES.find((option) => option.value === sectionType)?.label}
                  </h2>
                  {type === 'all' && result.meta.hasMore && (
                    <Button
                      variant="ghost"
                      size="xs"
                      rightIcon={ArrowRight}
                      onClick={() => update({ type: sectionType, page: 1 })}
                    >
                      See all
                    </Button>
                  )}
                </div>
                <ResultItems type={sectionType} items={result.items} />
                {type !== 'all' && (page > 1 || result.meta.hasMore) && (
                  <div className="mt-6 flex justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => update({ page: page - 1 })}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!result.meta.hasMore}
                      onClick={() => update({ page: page + 1 })}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
