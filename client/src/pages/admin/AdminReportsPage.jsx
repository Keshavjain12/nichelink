import { Ban, Check, ExternalLink, Flag, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ConfirmDialog } from '../../components/common/Dialog';
import { EmptyState, ErrorState, Skeleton } from '../../components/common/Feedback';
import { TextareaField } from '../../components/common/Field';
import { Pagination, RelativeTime } from '../../components/common/Misc';
import { Tabs } from '../../components/common/Tabs';
import { REPORT_REASONS, labelFor } from '../../constants/content';
import { useListReportsQuery, useResolveReportMutation } from '../../features/admin/adminApi';
import { useDocumentTitle } from '../../hooks/common';
import { getErrorMessage } from '../../utils/errors';

const ACTIONS = {
  dismiss: { label: 'Dismiss', icon: Check, variant: 'secondary', title: 'Dismiss this report?', description: 'No action will be taken. All open reports on this target are closed.', confirm: 'Dismiss report' },
  remove_content: { label: 'Remove content', icon: Trash2, variant: 'danger', title: 'Remove this content?', description: 'The content is hidden from members and its author is notified.', confirm: 'Remove content' },
  suspend_user: { label: 'Suspend author', icon: Ban, variant: 'danger', title: 'Suspend this member?', description: 'They are signed out everywhere and cannot sign in until reactivated.', confirm: 'Suspend member' },
};

const RESOLUTION_LABELS = { none: 'No action', content_removed: 'Content removed', user_suspended: 'Member suspended' };

function TargetPreview({ report }) {
  const { target, targetType } = report;
  if (!target) return <p className="text-sm text-fg-subtle italic">The reported {targetType.toLowerCase()} no longer exists.</p>;

  return (
    <Link to={target.link} className="group block rounded-xl border border-line bg-surface-muted/50 p-3 transition-colors hover:border-line-strong">
      {targetType === 'User' ? (
        <span className="flex items-center gap-3">
          <Avatar user={target} size="sm" />
          <span className="min-w-0">
            <span className="block text-sm font-medium">{target.name}</span>
            <span className="block text-xs text-fg-subtle">@{target.username}</span>
          </span>
        </span>
      ) : (
        <>
          {target.title && <span className="block text-sm font-semibold text-fg">{target.title}</span>}
          <span className="mt-0.5 line-clamp-3 block text-sm text-fg-muted">{target.excerpt}</span>
          <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
            {target.community && <span>in {target.community.name}</span>}
            {target.status !== 'published' && <Badge variant="danger">{target.status}</Badge>}
            <ExternalLink className="size-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
          </span>
        </>
      )}
    </Link>
  );
}

export default function AdminReportsPage() {
  useDocumentTitle('Admin · Reports');
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState(null);
  const [note, setNote] = useState('');
  const { data, isLoading, error, refetch } = useListReportsQuery({ status, page });
  const [resolveReport, { isLoading: resolving }] = useResolveReportMutation();

  const confirm = async () => {
    try {
      const result = await resolveReport({ id: pending.report.id, action: pending.action, note: note.trim() || undefined }).unwrap();
      toast.success(result.resolvedCount > 1 ? `${result.resolvedCount} reports resolved` : 'Report resolved');
      setPending(null);
      setNote('');
    } catch (resolveError) {
      toast.error(getErrorMessage(resolveError));
    }
  };

  return (
    <div className="space-y-4">
      <Tabs
        label="Report status"
        value={status}
        onChange={(value) => { setStatus(value); setPage(1); }}
        tabs={[
          { value: 'open', label: 'Moderation queue' },
          { value: 'resolved', label: 'Resolved' },
          { value: 'dismissed', label: 'Dismissed' },
          { value: 'all', label: 'All' },
        ]}
      />

      {error && <ErrorState error={error} onRetry={refetch} />}
      {isLoading && [0, 1, 2].map((index) => <Skeleton key={index} className="h-40 rounded-2xl" />)}
      {data?.items.length === 0 && (
        <EmptyState icon={ShieldCheck} title={status === 'open' ? 'The moderation queue is empty' : 'No reports here'} description={status === 'open' ? 'Nice — nothing needs your attention right now.' : undefined} />
      )}

      <div className="space-y-4">
        {data?.items.map((report) => (
          <Card key={report.id} as="article" className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="danger" icon={Flag}>{labelFor(REPORT_REASONS, report.reason)}</Badge>
              <Badge>{report.targetType}</Badge>
              {report.status !== 'open' && <Badge variant={report.status === 'resolved' ? 'success' : 'neutral'} className="capitalize">{report.status}</Badge>}
              <span className="ml-auto text-xs text-fg-subtle">Reported <RelativeTime value={report.createdAt} /></span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="space-y-3">
                <TargetPreview report={report} />
                {report.details && (
                  <blockquote className="border-l-2 border-line-strong pl-3 text-sm text-fg-muted">“{report.details}”</blockquote>
                )}
              </div>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-fg-subtle">Reported by</dt>
                  <dd className="mt-1">{report.reporter ? <Link to={`/profile/${report.reporter.username}`} className="font-medium hover:underline">{report.reporter.name}</Link> : 'Deleted member'}</dd>
                </div>
                {report.targetOwner && (
                  <div>
                    <dt className="text-xs text-fg-subtle">Content owner</dt>
                    <dd className="mt-1 flex items-center gap-2">
                      <Link to={`/profile/${report.targetOwner.username}`} className="font-medium hover:underline">{report.targetOwner.name}</Link>
                      {report.targetOwner.isSuspended && <Badge variant="danger">Suspended</Badge>}
                    </dd>
                  </div>
                )}
                {report.resolution && (
                  <div>
                    <dt className="text-xs text-fg-subtle">Resolution</dt>
                    <dd className="mt-1">
                      {RESOLUTION_LABELS[report.resolution.action]} by {report.resolution.resolvedBy?.name ?? 'an admin'}
                      {report.resolution.note && <span className="block text-xs text-fg-subtle">{report.resolution.note}</span>}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {report.status === 'open' && (
              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
                {Object.entries(ACTIONS)
                  .filter(([action]) => !(action === 'remove_content' && report.targetType === 'User'))
                  .map(([action, config]) => (
                    <Button key={action} size="sm" variant={config.variant} leftIcon={config.icon} onClick={() => setPending({ report, action })} disabled={action === 'suspend_user' && report.targetOwner?.isSuspended}>
                      {config.label}
                    </Button>
                  ))}
              </div>
            )}
          </Card>
        ))}
      </div>
      <Pagination page={page} totalPages={data?.meta.totalPages} onPageChange={setPage} />

      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => { setPending(null); setNote(''); }}
        title={pending && ACTIONS[pending.action].title}
        description={pending && ACTIONS[pending.action].description}
        confirmLabel={pending && ACTIONS[pending.action].confirm}
        variant={pending?.action === 'dismiss' ? 'primary' : 'danger'}
        loading={resolving}
        onConfirm={confirm}
      >
        <TextareaField id="resolution-note" label="Moderator note (optional)" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} />
      </ConfirmDialog>
    </div>
  );
}
