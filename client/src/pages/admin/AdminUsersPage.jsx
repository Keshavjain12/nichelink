import { Ban, Ellipsis, Search, ShieldCheck, ShieldOff, UserCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ConfirmDialog } from '../../components/common/Dialog';
import { EmptyState, ErrorState, Skeleton } from '../../components/common/Feedback';
import { Input, Select, TextareaField } from '../../components/common/Field';
import { Menu, MenuItem } from '../../components/common/Menu';
import { Pagination, RelativeTime } from '../../components/common/Misc';
import {
  useListAdminUsersQuery,
  useUpdateUserAdminMutation,
  useUpdateUserStatusMutation,
} from '../../features/admin/adminApi';
import { useDebouncedValue, useDocumentTitle } from '../../hooks/common';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/format';
import { getErrorMessage } from '../../utils/errors';

const ROLE_BADGES = { Admin: 'admin', ProMember: 'pro', FreeMember: 'neutral' };
const ROLE_LABELS = { Admin: 'Admin', ProMember: 'Pro', FreeMember: 'Free' };

export default function AdminUsersPage() {
  useDocumentTitle('Admin · Users');
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  const q = useDebouncedValue(search.trim(), 300);

  const { data, isLoading, isFetching, error, refetch } = useListAdminUsersQuery({ q, role, status, page });
  const [updateStatus, { isLoading: updatingStatus }] = useUpdateUserStatusMutation();
  const [updateAdmin, { isLoading: updatingAdmin }] = useUpdateUserAdminMutation();

  const confirmAction = async () => {
    const { type, user } = action;
    try {
      if (type === 'suspend') await updateStatus({ id: user.id, status: 'suspended', reason: reason.trim() || undefined }).unwrap();
      if (type === 'activate') await updateStatus({ id: user.id, status: 'active' }).unwrap();
      if (type === 'grant') await updateAdmin({ id: user.id, isAdmin: true }).unwrap();
      if (type === 'revoke') await updateAdmin({ id: user.id, isAdmin: false }).unwrap();
      toast.success({ suspend: 'Account suspended', activate: 'Account reactivated', grant: 'Admin access granted', revoke: 'Admin access revoked' }[type]);
      setAction(null);
      setReason('');
    } catch (actionError) {
      toast.error(getErrorMessage(actionError));
    }
  };

  const dialogCopy = action && {
    suspend: { title: `Suspend ${action.user.name}?`, description: 'They will be signed out everywhere and unable to sign in until reactivated.', confirm: 'Suspend account', variant: 'danger' },
    activate: { title: `Reactivate ${action.user.name}?`, description: 'They will be able to sign in again.', confirm: 'Reactivate', variant: 'primary' },
    grant: { title: `Make ${action.user.name} an admin?`, description: 'Admins can moderate all content, manage communities and suspend members.', confirm: 'Grant admin access', variant: 'primary' },
    revoke: { title: `Remove admin access from ${action.user.name}?`, description: 'Their role will return to Free or Pro based on their subscription.', confirm: 'Revoke admin access', variant: 'danger' },
  }[action.type];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="admin-user-search" className="sr-only">Search users</label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
          <Input id="admin-user-search" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Username or email prefix" className="pl-9" />
        </div>
        <label htmlFor="admin-user-role" className="sr-only">Role</label>
        <Select id="admin-user-role" value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }} className="sm:w-40">
          <option value="">All roles</option>
          <option value="FreeMember">Free</option>
          <option value="ProMember">Pro</option>
          <option value="Admin">Admin</option>
        </Select>
        <label htmlFor="admin-user-status" className="sr-only">Status</label>
        <Select id="admin-user-status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="sm:w-40">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </Select>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Platform members</caption>
              <thead className="border-b border-line bg-surface-muted text-xs text-fg-subtle uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Member</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Role</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Joined</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Last active</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-line ${isFetching && !isLoading ? 'opacity-70' : ''}`}>
                {isLoading &&
                  Array.from({ length: 6 }, (_, index) => (
                    <tr key={index}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td></tr>
                  ))}
                {data?.items.map((member) => {
                  const isSelf = member.id === currentUser.id;
                  return (
                    <tr key={member.id} className="hover:bg-surface-hover/60">
                      <td className="px-4 py-3">
                        <Link to={`/profile/${member.username}`} className="flex items-center gap-3">
                          <Avatar user={member} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-fg">{member.name}</span>
                            <span className="block truncate text-xs text-fg-subtle">{member.email}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3"><Badge variant={ROLE_BADGES[member.role]}>{ROLE_LABELS[member.role]}</Badge></td>
                      <td className="px-4 py-3">
                        <Badge variant={member.status === 'active' ? 'success' : 'danger'}>{member.status === 'active' ? 'Active' : 'Suspended'}</Badge>
                        {member.suspensionReason && <span className="mt-1 block max-w-48 truncate text-xs text-fg-subtle" title={member.suspensionReason}>{member.suspensionReason}</span>}
                      </td>
                      <td className="px-4 py-3 text-fg-muted">{formatDate(member.createdAt)}</td>
                      <td className="px-4 py-3 text-fg-muted"><RelativeTime value={member.lastActiveAt} /></td>
                      <td className="px-4 py-3 text-right">
                        {!isSelf && (
                          <Menu
                            label={`Actions for ${member.name}`}
                            trigger={(props) => (
                              <Button variant="ghost" size="icon-sm" {...props}><Ellipsis className="size-4" aria-hidden="true" /></Button>
                            )}
                          >
                            {member.status === 'active' ? (
                              <MenuItem icon={Ban} danger disabled={member.storedRole === 'Admin'} onClick={() => setAction({ type: 'suspend', user: member })}>
                                Suspend account
                              </MenuItem>
                            ) : (
                              <MenuItem icon={UserCheck} onClick={() => setAction({ type: 'activate', user: member })}>Reactivate account</MenuItem>
                            )}
                            {member.storedRole === 'Admin' ? (
                              <MenuItem icon={ShieldOff} danger onClick={() => setAction({ type: 'revoke', user: member })}>Revoke admin</MenuItem>
                            ) : (
                              member.status === 'active' && <MenuItem icon={ShieldCheck} onClick={() => setAction({ type: 'grant', user: member })}>Make admin</MenuItem>
                            )}
                          </Menu>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {data?.items.length === 0 && <EmptyState icon={Users} title="No members match these filters" />}
        </Card>
      )}
      <Pagination page={page} totalPages={data?.meta.totalPages} onPageChange={setPage} />

      <ConfirmDialog
        open={Boolean(action)}
        onClose={() => { setAction(null); setReason(''); }}
        title={dialogCopy?.title}
        description={dialogCopy?.description}
        confirmLabel={dialogCopy?.confirm}
        variant={dialogCopy?.variant}
        loading={updatingStatus || updatingAdmin}
        onConfirm={confirmAction}
      >
        {action?.type === 'suspend' && (
          <TextareaField id="suspension-reason" label="Reason (shown to the member when they try to sign in)" value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} />
        )}
      </ConfirmDialog>
    </div>
  );
}
