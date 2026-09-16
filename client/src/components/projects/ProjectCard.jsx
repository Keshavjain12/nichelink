import { Clock3, Coins, Globe, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PROJECT_COMMITMENTS, PROJECT_COMPENSATION, PROJECT_TYPES, labelFor } from '../../constants/content';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { Card } from '../common/Card';
import { Skeleton } from '../common/Feedback';
import { RelativeTime, StatPill, Tag } from '../common/Misc';

const INTEREST_BADGES = {
  pending: { variant: 'warning', label: 'Interest sent' },
  accepted: { variant: 'success', label: 'Accepted' },
  declined: { variant: 'neutral', label: 'Declined' },
};

export function ProjectMeta({ project }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      <StatPill icon={Clock3}>{labelFor(PROJECT_COMMITMENTS, project.commitment)}</StatPill>
      <StatPill icon={Coins}>{labelFor(PROJECT_COMPENSATION, project.compensation)}</StatPill>
      <StatPill icon={project.remote ? Globe : MapPin}>{project.remote ? 'Remote' : project.location || 'On-site'}</StatPill>
      <StatPill icon={Users}>{project.interestCount} interested</StatPill>
    </div>
  );
}

export function InterestBadge({ status }) {
  if (!status) return null;
  const badge = INTEREST_BADGES[status];
  return <Badge variant={badge.variant}>{badge.label}</Badge>;
}

export function ProjectCardSkeleton() {
  return (
    <Card className="space-y-3 p-5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </Card>
  );
}

export default function ProjectCard({ project }) {
  return (
    <Card as="article" className="relative flex h-full flex-col p-5 transition-colors hover:border-line-strong">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="brand">{labelFor(PROJECT_TYPES, project.projectType)}</Badge>
        {project.status === 'closed' && <Badge>Closed</Badge>}
        <InterestBadge status={project.viewer.interestStatus} />
        {project.viewer.isAuthor && <Badge variant="admin">Your project</Badge>}
      </div>
      <h2 className="mt-3 text-base font-semibold leading-snug text-fg">
        <Link to={`/projects/${project.id}`} className="after:absolute after:inset-0 after:rounded-2xl">
          {project.title}
        </Link>
      </h2>
      {project.summary && <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{project.summary}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {project.requiredSkills.slice(0, 5).map((skill) => (
          <Tag key={skill}>{skill}</Tag>
        ))}
      </div>
      <div className="mt-4 flex-1">
        <ProjectMeta project={project} />
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
        <Avatar user={project.author} size="xs" />
        <span className="truncate text-xs font-medium text-fg-muted">{project.author?.name}</span>
        <span className="text-xs text-fg-subtle">·</span>
        <RelativeTime value={project.createdAt} className="text-xs text-fg-subtle" />
      </div>
    </Card>
  );
}
