import { Compass, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { EmptyState, ErrorState } from '../../components/common/Feedback';
import { Input, Select } from '../../components/common/Field';
import { PageHeader, Pagination } from '../../components/common/Misc';
import CommunityCard, { CommunityCardSkeleton } from '../../components/community/CommunityCard';
import { PERMISSIONS } from '../../constants/app';
import { COMMUNITY_CATEGORIES } from '../../constants/content';
import { useListCommunitiesQuery } from '../../features/communities/communitiesApi';
import { useDebouncedValue, useDocumentTitle } from '../../hooks/common';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/misc';

export default function CommunitiesPage() {
  useDocumentTitle('Communities');
  const { can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const debouncedSearch = useDebouncedValue(search.trim(), 350);

  const filters = {
    q: searchParams.get('q') ?? '',
    category: searchParams.get('category') ?? '',
    access: searchParams.get('access') ?? '',
    sort: searchParams.get('sort') ?? 'popular',
    page: Number(searchParams.get('page') ?? 1),
  };

  const updateFilters = (changes) => {
    const next = new URLSearchParams(searchParams);
    Object.entries({ page: '', ...changes }).forEach(([key, value]) => {
      if (value === '' || value === undefined || value === null) next.delete(key);
      else next.set(key, String(value));
    });
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (debouncedSearch !== (searchParams.get('q') ?? '')) {
      const next = new URLSearchParams(searchParams);
      next.delete('page');
      if (debouncedSearch) next.set('q', debouncedSearch);
      else next.delete('q');
      setSearchParams(next, { replace: true });
    }
  }, [debouncedSearch, searchParams, setSearchParams]);

  const { data, isLoading, isFetching, error, refetch } = useListCommunitiesQuery({
    ...filters,
    limit: 12,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communities"
        description="Focused spaces for your role, stack and lifestyle. Join the ones that match your work."
        actions={
          can(PERMISSIONS.COMMUNITY_MANAGE) && (
            <Button as={Link} to="/admin/communities?create=1" leftIcon={Plus}>
              New community
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <label htmlFor="community-search" className="sr-only">
            Search communities
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden="true"
          />
          <Input
            id="community-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, topic or tag"
            className="pl-9"
          />
        </div>
        <div className="flex gap-3">
          <label htmlFor="community-access" className="sr-only">
            Access
          </label>
          <Select
            id="community-access"
            value={filters.access}
            onChange={(event) => updateFilters({ access: event.target.value })}
            className="w-36"
          >
            <option value="">All access</option>
            <option value="public">Public</option>
            <option value="pro">Pro only</option>
          </Select>
          <label htmlFor="community-sort" className="sr-only">
            Sort
          </label>
          <Select
            id="community-sort"
            value={filters.sort}
            onChange={(event) => updateFilters({ sort: event.target.value })}
            className="w-40"
            disabled={Boolean(filters.q)}
          >
            <option value="popular">Most members</option>
            <option value="active">Recently active</option>
            <option value="newest">Newest</option>
            <option value="name">A–Z</option>
          </Select>
        </div>
      </div>

      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        role="group"
        aria-label="Filter by category"
      >
        {['', ...COMMUNITY_CATEGORIES].map((category) => (
          <button
            key={category || 'all'}
            type="button"
            aria-pressed={filters.category === category}
            onClick={() => updateFilters({ category })}
            className={cn(
              'h-8 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors',
              filters.category === category
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg',
            )}
          >
            {category || 'All'}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          {data && (
            <p className="text-sm text-fg-subtle" aria-live="polite">
              {data.meta.total} {data.meta.total === 1 ? 'community' : 'communities'}
            </p>
          )}
          <div
            className={cn(
              'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3',
              isFetching && !isLoading && 'opacity-70',
            )}
          >
            {isLoading &&
              Array.from({ length: 6 }, (_, index) => <CommunityCardSkeleton key={index} />)}
            {data?.items.map((community) => (
              <CommunityCard key={community.id} community={community} />
            ))}
          </div>
          {data?.items.length === 0 && (
            <EmptyState
              icon={Compass}
              title="No communities match those filters"
              description="Try a different search term or category."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    setSearchParams({});
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          )}
          <Pagination
            page={filters.page}
            totalPages={data?.meta.totalPages}
            onPageChange={(page) => updateFilters({ page })}
          />
        </>
      )}
    </div>
  );
}
