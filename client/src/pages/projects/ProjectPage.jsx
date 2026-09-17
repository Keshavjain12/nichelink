import { ArrowLeft, Check, MessagesSquare, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar } from '../../components/common/Avatar';
import { Badge, UserBadges } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card, CardHeader } from '../../components/common/Card';
import { ConfirmDialog, Dialog } from '../../components/common/Dialog';
import { EmptyState, ErrorState, PageLoader, Skeleton } from '../../components/common/Feedback';
import { TextareaField } from '../../components/common/Field';
import { RelativeTime, Tag } from '../../components/common/Misc';
import { InterestBadge, ProjectMeta } from '../../components/projects/ProjectCard';
import { PROJECT_TYPES, labelFor } from '../../constants/content';
import {
  useDeleteProjectMutation,
  useExpressInterestMutation,
  useGetProjectQuery,
  useListProjectInterestsQuery,
  useUpdateProjectInterestMutation,
  useUpdateProjectMutation,
  useWithdrawInterestMutation,
} from '../../features/projects/projectsApi';
import { useDocumentTitle } from '../../hooks/common';
import { getErrorMessage } from '../../utils/errors';

function InterestsPanel({ projectId }) {
  const { data, isLoading, error, refetch } = useListProjectInterestsQuery(projectId);
  const [updateInterest, { isLoading: updating }] = useUpdateProjectInterestMutation();

  const decide = async (interestId, status) => {
    try {
      await updateInterest({ projectId, interestId, status }).unwrap();
      toast.success(status === 'accepted' ? 'Collaborator accepted' : 'Request declined');
    } catch (decideError) {
      toast.error(getErrorMessage(decideError));
    }
  };

  return (
    <Card>
      <CardHeader title="Interested members" description="Only you can see this list." />
      <div className="p-3">
        {isLoading && <Skeleton className="h-24 rounded-xl" />}
        {error && <ErrorState error={error} onRetry={refetch} className="py-6" />}
        {data?.items.length === 0 && <EmptyState title="No interest yet" description="Share your project in a relevant community to reach more people." className="py-6" />}
        <ul className="divide-y divide-line">
          {data?.items.map((interest) => (
            <li key={interest.id} className="flex flex-col gap-3 px-2 py-4 sm:flex-row sm:items-start">
              <Link to={`/profile/${interest.user.username}`} className="flex min-w-0 flex-1 gap-3">
                <Avatar user={interest.user} size="sm" />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">{interest.user.name} <UserBadges user={interest.user} /></span>
                  <span className="block text-xs text-fg-subtle">{interest.user.headline}</span>
                  {interest.message && <span className="mt-1.5 block text-sm whitespace-pre-wrap text-fg-muted">{interest.message}</span>}
                  <RelativeTime value={interest.createdAt} className="mt-1 block text-xs text-fg-subtle" />
                </span>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                {interest.status === 'pending' ? (
                  <>
                    <Button size="xs" variant="secondary" leftIcon={X} disabled={updating} onClick={() => decide(interest.id, 'declined')}>Decline</Button>
                    <Button size="xs" leftIcon={Check} disabled={updating} onClick={() => decide(interest.id, 'accepted')}>Accept</Button>
                  </>
                ) : (
                  <InterestBadge status={interest.status} />
                )}
                <Button as={Link} to={`/messages?to=${interest.user.id}`} size="icon-sm" variant="ghost" aria-label={`Message ${interest.user.name}`}>
                  <MessagesSquare className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

export default function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: project, isLoading, error, refetch } = useGetProjectQuery(id);
  const [expressInterest, { isLoading: sending }] = useExpressInterestMutation();
  const [withdrawInterest, { isLoading: withdrawing }] = useWithdrawInterestMutation();
  const [updateProject, { isLoading: updating }] = useUpdateProjectMutation();
  const [deleteProject, { isLoading: deleting }] = useDeleteProjectMutation();
  const [interestOpen, setInterestOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState('');
  useDocumentTitle(project?.title ?? 'Project');

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} title={error.status === 404 ? 'Project not found' : 'Could not load project'} onRetry={error.status === 404 ? undefined : refetch} />;

  const { viewer } = project;

  const submitInterest = async (event) => {
    event.preventDefault();
    try {
      await expressInterest({ id: project.id, message: message.trim() }).unwrap();
      toast.success(`${project.author.name.split(' ')[0]} has been notified`);
      setInterestOpen(false);
      setMessage('');
    } catch (submitError) {
      toast.error(getErrorMessage(submitError));
    }
  };

  const toggleStatus = async () => {
    try {
      await updateProject({ id: project.id, status: project.status === 'open' ? 'closed' : 'open' }).unwrap();
      toast.success(project.status === 'open' ? 'Project closed to new interest' : 'Project reopened');
    } catch (statusError) {
      toast.error(getErrorMessage(statusError));
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden="true" /> All projects
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <Card as="article" className="p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="brand">{labelFor(PROJECT_TYPES, project.projectType)}</Badge>
              <Badge variant={project.status === 'open' ? 'success' : 'neutral'}>{project.status === 'open' ? 'Open' : 'Closed'}</Badge>
              <InterestBadge status={viewer.interestStatus} />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">{project.title}</h1>
            {project.summary && <p className="mt-2 text-base text-fg-muted">{project.summary}</p>}
            <div className="mt-5"><ProjectMeta project={project} /></div>
            <h2 className="mt-8 text-sm font-semibold">About the project</h2>
            <p className="mt-2 text-[15px] leading-7 whitespace-pre-wrap break-words text-fg">{project.description}</p>
            <h2 className="mt-8 text-sm font-semibold">Skills needed</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {project.requiredSkills.map((skill) => <Tag key={skill} className="text-sm">{skill}</Tag>)}
            </div>
            <p className="mt-8 text-xs text-fg-subtle">Posted <RelativeTime value={project.createdAt} /></p>
          </Card>

          {viewer.isAuthor && <InterestsPanel projectId={project.id} />}
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <Link to={`/profile/${project.author.username}`} className="flex items-center gap-3">
              <Avatar user={project.author} showPresence />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold">{project.author.name} <UserBadges user={project.author} /></span>
                <span className="block truncate text-xs text-fg-subtle">{project.author.headline}</span>
              </span>
            </Link>

            <div className="mt-5 space-y-2">
              {viewer.canExpressInterest && (
                <Button className="w-full" onClick={() => setInterestOpen(true)}>I'm interested</Button>
              )}
              {viewer.interestStatus === 'pending' && (
                <Button
                  variant="secondary"
                  className="w-full"
                  loading={withdrawing}
                  onClick={async () => {
                    try {
                      await withdrawInterest(project.id).unwrap();
                      toast.success('Interest withdrawn');
                    } catch (withdrawError) {
                      toast.error(getErrorMessage(withdrawError));
                    }
                  }}
                >
                  Withdraw interest
                </Button>
              )}
              {!viewer.isAuthor && (
                <Button as={Link} to={`/messages?to=${project.author.id}`} variant="secondary" leftIcon={MessagesSquare} className="w-full">
                  Message {project.author.name.split(' ')[0]}
                </Button>
              )}
              {viewer.canEdit && (
                <>
                  <Button as={Link} to={`/projects/${project.id}/edit`} variant="secondary" leftIcon={Pencil} className="w-full">Edit project</Button>
                  <Button variant="secondary" className="w-full" loading={updating} onClick={toggleStatus}>
                    {project.status === 'open' ? 'Close to new interest' : 'Reopen project'}
                  </Button>
                </>
              )}
              {viewer.canDelete && (
                <Button variant="danger-ghost" leftIcon={Trash2} className="w-full" onClick={() => setConfirmDelete(true)}>Delete project</Button>
              )}
            </div>
          </Card>
        </aside>
      </div>

      <Dialog open={interestOpen} onClose={() => setInterestOpen(false)} title="Express interest" description={`Introduce yourself to ${project.author.name}. They'll be notified right away.`}>
        <form onSubmit={submitInterest} className="space-y-4">
          <TextareaField
            id="interest-message"
            label="Message"
            value={message}
            maxLength={1000}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Relevant experience, availability and what excites you about the project"
            className="[&_textarea]:min-h-32"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setInterestOpen(false)}>Cancel</Button>
            <Button type="submit" loading={sending}>Send</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this project?"
        description="It will be removed from Project Match. Interested members keep their message history."
        confirmLabel="Delete project"
        loading={deleting}
        onConfirm={async () => {
          try {
            await deleteProject(project.id).unwrap();
            toast.success('Project deleted');
            navigate('/projects', { replace: true });
          } catch (deleteError) {
            toast.error(getErrorMessage(deleteError));
          }
        }}
      />
    </div>
  );
}
