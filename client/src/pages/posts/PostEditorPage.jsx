import { zodResolver } from '@hookform/resolvers/zod';
import { Compass } from 'lucide-react';
import { lazy, Suspense, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { useGetConfigQuery } from '../../app/api';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import {
  EmptyState,
  ErrorState,
  InlineAlert,
  PageLoader,
  Skeleton,
} from '../../components/common/Feedback';
import { FormField, SelectField, TextField } from '../../components/common/Field';
import { PageHeader, TagInput, UpgradeCallout } from '../../components/common/Misc';
import ImageUploader from '../../components/post/ImageUploader';
import { PERMISSIONS, STORAGE_KEYS } from '../../constants/app';
import { LIMITS } from '../../constants/content';
import { useGetMyCommunitiesQuery } from '../../features/communities/communitiesApi';
import {
  useCreatePostMutation,
  useGetPostQuery,
  useUpdatePostMutation,
} from '../../features/posts/postsApi';
import { useDebouncedValue, useDocumentTitle } from '../../hooks/common';
import { useAuth } from '../../hooks/useAuth';
import { applyFieldErrors, getErrorMessage } from '../../utils/errors';
import { readStorage, writeStorage } from '../../utils/misc';

const RichTextEditor = lazy(() => import('../../components/post/RichTextEditor'));

const postSchema = z.object({
  community: z.string().min(1, 'Choose a community'),
  title: z
    .string()
    .trim()
    .min(LIMITS.POST_TITLE_MIN, `Title must be at least ${LIMITS.POST_TITLE_MIN} characters`)
    .max(LIMITS.POST_TITLE_MAX, `Keep the title under ${LIMITS.POST_TITLE_MAX} characters`),
  content: z.string(),
  contentText: z.string().trim().min(1, 'Write something before publishing'),
  tags: z.array(z.string()).max(LIMITS.POST_MAX_TAGS),
  images: z
    .array(z.object({ url: z.string(), publicId: z.string() }).passthrough())
    .max(LIMITS.POST_MAX_IMAGES),
});

function loadDraft() {
  try {
    return JSON.parse(readStorage(STORAGE_KEYS.POST_DRAFT, 'null'));
  } catch {
    return null;
  }
}

function EditorForm({ existingPost }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditing = Boolean(existingPost);
  const { data: config } = useGetConfigQuery();
  const { data: communities, isLoading: loadingCommunities } = useGetMyCommunitiesQuery(undefined, {
    skip: isEditing,
  });
  const [createPost, { isLoading: creating }] = useCreatePostMutation();
  const [updatePost, { isLoading: updating }] = useUpdatePostMutation();

  const draft = isEditing ? null : loadDraft();
  const postable = (communities ?? []).filter((community) => community.viewer?.canPost);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(postSchema),
    defaultValues: isEditing
      ? {
          community: existingPost.community.slug,
          title: existingPost.title,
          content: existingPost.content,
          contentText: existingPost.excerpt || ' ',
          tags: existingPost.tags,
          images: existingPost.images,
        }
      : {
          community: searchParams.get('community') ?? draft?.community ?? '',
          title: draft?.title ?? '',
          content: draft?.content ?? '',
          contentText: draft?.contentText ?? '',
          tags: draft?.tags ?? [],
          images: [],
        },
  });

  const values = watch();
  const debouncedDraft = useDebouncedValue(
    JSON.stringify({
      community: values.community,
      title: values.title,
      content: values.content,
      contentText: values.contentText,
      tags: values.tags,
    }),
    800,
  );
  useEffect(() => {
    if (!isEditing && isDirty) writeStorage(STORAGE_KEYS.POST_DRAFT, debouncedDraft);
  }, [debouncedDraft, isEditing, isDirty]);

  const onSubmit = async ({ community, title, content, tags, images }) => {
    try {
      const post = isEditing
        ? await updatePost({ id: existingPost.id, title, content, tags, images }).unwrap()
        : await createPost({ community, title, content, tags, images }).unwrap();
      if (!isEditing) writeStorage(STORAGE_KEYS.POST_DRAFT, null);
      toast.success(isEditing ? 'Post updated' : 'Post published');
      navigate(`/posts/${post.id}`, { replace: true });
    } catch (error) {
      if (!applyFieldErrors(error, setError)) toast.error(getErrorMessage(error));
    }
  };

  if (!isEditing && loadingCommunities) return <Skeleton className="h-96 rounded-2xl" />;

  if (!isEditing && postable.length === 0) {
    return (
      <EmptyState
        icon={Compass}
        title="Join a community before posting"
        description="Posts live inside communities. Join one that matches your topic, then come back to publish."
        action={
          <Button as={Link} to="/communities">
            Find communities
          </Button>
        }
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Card className="space-y-6 p-5 sm:p-7">
        {isEditing ? (
          <p className="text-sm text-fg-muted">
            Posting in{' '}
            <span className="font-medium text-fg">
              {existingPost.community.icon} {existingPost.community.name}
            </span>
          </p>
        ) : (
          <SelectField
            id="community"
            label="Community"
            required
            error={errors.community?.message}
            {...register('community')}
          >
            <option value="">Choose a community…</option>
            {postable.map((community) => (
              <option key={community.id} value={community.slug}>
                {community.icon} {community.name}
              </option>
            ))}
          </SelectField>
        )}

        <div>
          <TextField
            id="title"
            label="Title"
            required
            maxLength={LIMITS.POST_TITLE_MAX}
            placeholder="What do you want to discuss?"
            error={errors.title?.message}
            {...register('title')}
          />
          <p className="mt-1 text-right text-xs text-fg-subtle">
            {values.title.length}/{LIMITS.POST_TITLE_MAX}
          </p>
        </div>

        <FormField id="post-content" label="Body" required error={errors.contentText?.message}>
          {() => (
            <Controller
              control={control}
              name="content"
              render={({ field }) => (
                <Controller
                  control={control}
                  name="contentText"
                  render={({ field: textField }) => (
                    <Suspense fallback={<Skeleton className="h-72 rounded-lg" />}>
                      <RichTextEditor
                        id="post-content"
                        ariaLabel="Post body"
                        placeholder="Share context, what you tried and what you learned…"
                        initialValue={field.value}
                        invalid={Boolean(errors.contentText)}
                        onChange={(html, text) => {
                          field.onChange(html);
                          textField.onChange(text);
                        }}
                      />
                    </Suspense>
                  )}
                />
              )}
            />
          )}
        </FormField>

        <FormField
          id="tags"
          label="Tags"
          hint={`Up to ${LIMITS.POST_MAX_TAGS} topics, e.g. stripe, kubernetes`}
          error={errors.tags?.message}
        >
          {(fieldProps) => (
            <Controller
              control={control}
              name="tags"
              render={({ field }) => (
                <TagInput
                  {...fieldProps}
                  value={field.value}
                  onChange={field.onChange}
                  max={LIMITS.POST_MAX_TAGS}
                />
              )}
            />
          )}
        </FormField>

        <div>
          <p className="mb-1.5 text-sm font-medium">Images</p>
          {config?.features.uploads ? (
            <Controller
              control={control}
              name="images"
              render={({ field }) => (
                <ImageUploader value={field.value} onChange={field.onChange} />
              )}
            />
          ) : (
            <InlineAlert variant="info">
              Image uploads are not configured on this server.
            </InlineAlert>
          )}
        </div>
      </Card>

      <div className="sticky bottom-16 z-10 mt-4 flex justify-end gap-2 rounded-2xl border border-line bg-surface/90 p-3 backdrop-blur lg:bottom-4">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button type="submit" loading={creating || updating}>
          {isEditing ? 'Save changes' : 'Publish'}
        </Button>
      </div>
    </form>
  );
}

export default function PostEditorPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const isEditing = Boolean(id);
  useDocumentTitle(isEditing ? 'Edit post' : 'New discussion');
  const { data: post, isLoading, error, refetch } = useGetPostQuery(id, { skip: !isEditing });

  if (!can(PERMISSIONS.POST_CREATE)) {
    return (
      <div className="mx-auto max-w-2xl">
        <UpgradeCallout
          title="Publishing is a Pro feature"
          description="Upgrade to Pro to start discussions with rich text and images."
        />
      </div>
    );
  }
  if (isEditing && isLoading) return <PageLoader />;
  if (isEditing && error) return <ErrorState error={error} onRetry={refetch} />;
  if (isEditing && !post.permissions.canEdit) {
    return (
      <ErrorState
        error="You can only edit your own published posts."
        title="Editing isn't available"
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={isEditing ? 'Edit post' : 'Start a discussion'}
        description={
          isEditing
            ? 'Update your post. Readers will see an "edited" label.'
            : 'Ask a question, share a lesson or start a debate. Drafts are saved on this device.'
        }
      />
      <EditorForm key={post?.id ?? 'new'} existingPost={isEditing ? post : null} />
    </div>
  );
}
