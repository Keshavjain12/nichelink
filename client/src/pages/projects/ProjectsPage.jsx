import { Briefcase, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { EmptyState, ErrorState } from '../../components/common/Feedback';
import { Input, Select } from '../../components/common/Field';
import { LoadMore, PageHeader } from '../../components/common/Misc';
import { Tabs } from '../../components/common/Tabs';
import ProjectCard, { ProjectCardSkeleton } from '../../components/projects/ProjectCard';
import { PERMISSIONS } from '../../constants/app';
import { PROJECT_COMMITMENTS, PROJECT_COMPENSATION, PROJECT_TYPES } from '../../constants/content';
import { useListProjectsInfiniteQuery } from '../../features/projects/projectsApi';
import { useDebouncedValue, useDocumentTitle } from '../../hooks/common';
import { useAuth } from '../../hooks/useAuth';

export default function ProjectsPage() {
  useDocumentTitle('Project Match');
  const { can } = useAuth();
  const [tab, setTab] = useState('browse');
  const [search, setSearch] = useState('');
  const [skills, setSkills] = useState('');
  const [filters, setFilters] = useState({
    projectType: '',
    commitment: '',
    compensation: '',
    remote: '',
  });
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const debouncedSkills = useDebouncedValue(skills.trim(), 350);
  const canCreate = can(PERMISSIONS.PROJECT_CREATE);

  const params = {
    q: debouncedSearch,
    skills: debouncedSkills,
    ...filters,
    ...(tab === 'mine' && { mine: 'true', status: 'all' }),
  };
  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useListProjectsInfiniteQuery(params);
  const projects = (data?.pages ?? []).flatMap((page) => page.items);
  const setFilter = (key) => (event) =>
    setFilters((current) => ({ ...current, [key]: event.target.value }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Project Match"
        title="Find collaborators for what you're building"
        description="Side projects, open source, startups and freelance work — posted by Pro members, open to everyone."
        actions={
          canCreate ? (
            <Button as={Link} to="/projects/new" leftIcon={Plus}>
              Post a project
            </Button>
          ) : (
            <Button as={Link} to="/pricing" variant="pro">
              Post projects with Pro
            </Button>
          )
        }
      />

      {canCreate && (
        <Tabs
          label="Project views"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'browse', label: 'Browse' },
            { value: 'mine', label: 'My projects' },
          ]}
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <label htmlFor="project-search" className="sr-only">
            Search projects
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden="true"
          />
          <Input
            id="project-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects"
            className="pl-9"
          />
        </div>
        <div>
          <label htmlFor="project-skills" className="sr-only">
            Skills
          </label>
          <Input
            id="project-skills"
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
            placeholder="Skills: react, go"
          />
        </div>
        <div>
          <label htmlFor="project-type" className="sr-only">
            Project type
          </label>
          <Select id="project-type" value={filters.projectType} onChange={setFilter('projectType')}>
            <option value="">Any type</option>
            {PROJECT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="project-commitment" className="sr-only">
            Commitment
          </label>
          <Select
            id="project-commitment"
            value={filters.commitment}
            onChange={setFilter('commitment')}
          >
            <option value="">Any commitment</option>
            {PROJECT_COMMITMENTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="project-compensation" className="sr-only">
            Compensation
          </label>
          <Select
            id="project-compensation"
            value={filters.compensation}
            onChange={setFilter('compensation')}
          >
            <option value="">Any compensation</option>
            {PROJECT_COMPENSATION.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="project-remote" className="sr-only">
            Location
          </label>
          <Select id="project-remote" value={filters.remote} onChange={setFilter('remote')}>
            <option value="">Remote or on-site</option>
            <option value="true">Remote only</option>
            <option value="false">On-site only</option>
          </Select>
        </div>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {isLoading &&
              Array.from({ length: 6 }, (_, index) => <ProjectCardSkeleton key={index} />)}
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
          {!isLoading && projects.length === 0 && (
            <EmptyState
              icon={Briefcase}
              title={
                tab === 'mine'
                  ? "You haven't posted any projects"
                  : 'No projects match these filters'
              }
              description={
                tab === 'mine'
                  ? 'Describe what you are building and the skills you need.'
                  : 'Try removing a filter or searching for a different skill.'
              }
              action={
                tab === 'mine' && (
                  <Button as={Link} to="/projects/new" leftIcon={Plus}>
                    Post a project
                  </Button>
                )
              }
            />
          )}
          <LoadMore
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        </>
      )}
    </div>
  );
}
