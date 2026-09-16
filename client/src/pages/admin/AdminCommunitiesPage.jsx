import { zodResolver } from '@hookform/resolvers/zod';
import { Archive, ArchiveRestore, Compass, Pencil, Plus, Search, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Dialog } from '../../components/common/Dialog';
import { EmptyState, ErrorState, Skeleton } from '../../components/common/Feedback';
import { FormField, Input, Select, SelectField, TextareaField, TextField } from '../../components/common/Field';
import { Pagination, TagInput } from '../../components/common/Misc';
import { CommunityIcon } from '../../components/community/CommunityCard';
import { COMMUNITY_CATEGORIES } from '../../constants/content';
import { useListAdminCommunitiesQuery } from '../../features/admin/adminApi';
import { useCreateCommunityMutation, useUpdateCommunityMutation } from '../../features/communities/communitiesApi';
import { useDebouncedValue, useDocumentTitle } from '../../hooks/common';
import { formatCompactNumber } from '../../utils/format';
import { applyFieldErrors, getErrorMessage } from '../../utils/errors';

const communitySchema = z.object({
  name: z.string().trim().min(3, 'At least 3 characters').max(60),
  tagline: z.string().trim().max(140),
  description: z.string().trim().max(2000),
  icon: z.string().trim().min(1, 'Pick an emoji').max(8),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour'),
  category: z.string().min(1, 'Choose a category'),
  accessType: z.enum(['public', 'pro']),
  tags: z.array(z.string()).max(8),
  rulesText: z.string().max(3000),
  isFeatured: z.boolean(),
});

const rulesToText = (rules = []) => rules.map((rule) => (rule.description ? `${rule.title}: ${rule.description}` : rule.title)).join('\n');
const textToRules = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((line) => {
      const [title, ...rest] = line.split(':');
      return { title: title.trim().slice(0, 80), description: rest.join(':').trim().slice(0, 300) };
    });

function CommunityFormDialog({ open, onClose, community }) {
  const [createCommunity, { isLoading: creating }] = useCreateCommunityMutation();
  const [updateCommunity, { isLoading: updating }] = useUpdateCommunityMutation();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(communitySchema) });

  useEffect(() => {
    if (!open) return;
    reset({
      name: community?.name ?? '',
      tagline: community?.tagline ?? '',
      description: community?.description ?? '',
      icon: community?.icon ?? '💬',
      accentColor: community?.accentColor ?? '#4f46e5',
      category: community?.category ?? '',
      accessType: community?.accessType ?? 'public',
      tags: community?.tags ?? [],
      rulesText: rulesToText(community?.rules),
      isFeatured: community?.isFeatured ?? false,
    });
  }, [open, community, reset]);

  const onSubmit = async ({ rulesText, ...values }) => {
    const body = { ...values, rules: textToRules(rulesText) };
    try {
      if (community) await updateCommunity({ slug: community.slug, ...body }).unwrap();
      else await createCommunity(body).unwrap();
      toast.success(community ? 'Community updated' : 'Community created');
      onClose();
    } catch (error) {
      if (!applyFieldErrors(error, setError)) toast.error(getErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} size="lg" title={community ? `Edit ${community.name}` : 'Create a community'} description="Communities are created by admins; members join and moderators keep them healthy.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_96px_120px]">
          <TextField id="community-name" label="Name" required error={errors.name?.message ?? errors.slug?.message} {...register('name')} />
          <TextField id="community-icon" label="Icon" required error={errors.icon?.message} {...register('icon')} />
          <FormField id="community-color" label="Accent" error={errors.accentColor?.message}>
            {(fieldProps) => <Input type="color" className="h-10 p-1" {...fieldProps} {...register('accentColor')} />}
          </FormField>
        </div>
        <TextField id="community-tagline" label="Tagline" error={errors.tagline?.message} {...register('tagline')} />
        <TextareaField id="community-description" label="Description" error={errors.description?.message} {...register('description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField id="community-category" label="Category" required error={errors.category?.message} {...register('category')}>
            <option value="">Select…</option>
            {COMMUNITY_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </SelectField>
          <SelectField id="community-access" label="Access" {...register('accessType')}>
            <option value="public">Public (Free members can read)</option>
            <option value="pro">Pro members only</option>
          </SelectField>
        </div>
        <FormField id="community-tags" label="Tags" hint="Used for recommendations" error={errors.tags?.message}>
          {(fieldProps) => <Controller control={control} name="tags" render={({ field }) => <TagInput {...fieldProps} value={field.value ?? []} onChange={field.onChange} max={8} />} />}
        </FormField>
        <TextareaField id="community-rules" label="Rules" hint="One rule per line. Optional description after a colon." error={errors.rulesText?.message} {...register('rulesText')} />
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="size-4 accent-brand-600" {...register('isFeatured')} />
          Feature on the landing page and directory
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={creating || updating}>{community ? 'Save changes' : 'Create community'}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export default function AdminCommunitiesPage() {
  useDocumentTitle('Admin · Communities');
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const creating = searchParams.get('create') === '1';
  const q = useDebouncedValue(search.trim(), 300);
  const { data, isLoading, error, refetch } = useListAdminCommunitiesQuery({ q, status, page });
  const [updateCommunity] = useUpdateCommunityMutation();

  const quickUpdate = async (community, changes, message) => {
    try {
      await updateCommunity({ slug: community.slug, ...changes }).unwrap();
      toast.success(message);
    } catch (updateError) {
      toast.error(getErrorMessage(updateError));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="admin-community-search" className="sr-only">Search communities</label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
          <Input id="admin-community-search" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search communities" className="pl-9" />
        </div>
        <label htmlFor="admin-community-status" className="sr-only">Status</label>
        <Select id="admin-community-status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="sm:w-40">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </Select>
        <Button leftIcon={Plus} onClick={() => setSearchParams({ create: '1' })}>New community</Button>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="sr-only">Communities</caption>
              <thead className="border-b border-line bg-surface-muted text-xs text-fg-subtle uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Community</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Access</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Members</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Posts</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {isLoading && Array.from({ length: 5 }, (_, index) => <tr key={index}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-9 w-full" /></td></tr>)}
                {data?.items.map((community) => (
                  <tr key={community.id} className="hover:bg-surface-hover/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <CommunityIcon community={community} size="sm" />
                        <div className="min-w-0">
                          <Link to={`/communities/${community.slug}`} className="block truncate font-medium text-fg hover:underline">{community.name}</Link>
                          <span className="text-xs text-fg-subtle">{community.category} · /{community.slug}</span>
                        </div>
                        {community.isFeatured && <Badge variant="brand" icon={Star}>Featured</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant={community.accessType === 'pro' ? 'pro' : 'neutral'}>{community.accessType === 'pro' ? 'Pro' : 'Public'}</Badge></td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCompactNumber(community.memberCount)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCompactNumber(community.postCount)}</td>
                    <td className="px-4 py-3"><Badge variant={community.status === 'active' ? 'success' : 'neutral'}>{community.status === 'active' ? 'Active' : 'Archived'}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label={community.isFeatured ? `Unfeature ${community.name}` : `Feature ${community.name}`} aria-pressed={community.isFeatured} onClick={() => quickUpdate(community, { isFeatured: !community.isFeatured }, community.isFeatured ? 'Removed from featured' : 'Featured community')}>
                          <Star className={`size-4 ${community.isFeatured ? 'fill-amber-400 text-amber-500' : ''}`} aria-hidden="true" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${community.name}`} onClick={() => setEditing(community)}>
                          <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={community.status === 'active' ? `Archive ${community.name}` : `Restore ${community.name}`}
                          onClick={() => quickUpdate(community, { status: community.status === 'active' ? 'archived' : 'active' }, community.status === 'active' ? 'Community archived' : 'Community restored')}
                        >
                          {community.status === 'active' ? <Archive className="size-4" aria-hidden="true" /> : <ArchiveRestore className="size-4" aria-hidden="true" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data?.items.length === 0 && <EmptyState icon={Compass} title="No communities found" />}
        </Card>
      )}
      <Pagination page={page} totalPages={data?.meta.totalPages} onPageChange={setPage} />

      <CommunityFormDialog open={creating} onClose={() => setSearchParams({})} />
      <EditCommunityLoader community={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

/** Admin list rows omit description and rules, so load full details before editing. */
function EditCommunityLoader({ community, onClose }) {
  return <EditCommunityDialog key={community?.slug ?? 'none'} slug={community?.slug} onClose={onClose} />;
}

function EditCommunityDialog({ slug, onClose }) {
  const [details, setDetails] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!slug) return undefined;
    let cancelled = false;
    import('../../app/store').then(({ store }) =>
      store
        .dispatch(
          (async (dispatch) => {
            const { communitiesApi } = await import('../../features/communities/communitiesApi');
            return dispatch(communitiesApi.endpoints.getCommunity.initiate(slug, { subscribe: false, forceRefetch: true })).unwrap();
          }),
        )
        .then((data) => !cancelled && setDetails(data))
        .catch((error) => !cancelled && setLoadError(error)),
    );
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!slug) return null;
  if (loadError) {
    toast.error(getErrorMessage(loadError));
    onClose();
    return null;
  }
  return details ? <CommunityFormDialog open onClose={onClose} community={details} /> : null;
}
