import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ErrorState, PageLoader } from '../../components/common/Feedback';
import { FormField, SelectField, TextareaField, TextField } from '../../components/common/Field';
import { PageHeader, TagInput, UpgradeCallout } from '../../components/common/Misc';
import { PERMISSIONS } from '../../constants/app';
import { PROJECT_COMMITMENTS, PROJECT_COMPENSATION, PROJECT_TYPES } from '../../constants/content';
import { useCreateProjectMutation, useGetProjectQuery, useUpdateProjectMutation } from '../../features/projects/projectsApi';
import { useDocumentTitle } from '../../hooks/common';
import { useAuth } from '../../hooks/useAuth';
import { applyFieldErrors, getErrorMessage } from '../../utils/errors';

const projectSchema = z
  .object({
    title: z.string().trim().min(5, 'At least 5 characters').max(120),
    summary: z.string().trim().max(200),
    description: z.string().trim().min(30, 'Describe the project in at least 30 characters').max(5000),
    requiredSkills: z.array(z.string()).min(1, 'Add at least one skill').max(12),
    projectType: z.string().min(1, 'Choose a project type'),
    commitment: z.string().min(1, 'Choose a commitment'),
    compensation: z.string().min(1, 'Choose compensation'),
    remote: z.boolean(),
    location: z.string().trim().max(80),
  })
  .refine((value) => value.remote || value.location.length > 0, { path: ['location'], message: 'Add a location for on-site projects' });

function ProjectForm({ project }) {
  const navigate = useNavigate();
  const [createProject, { isLoading: creating }] = useCreateProjectMutation();
  const [updateProject, { isLoading: updating }] = useUpdateProjectMutation();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: project?.title ?? '',
      summary: project?.summary ?? '',
      description: project?.description ?? '',
      requiredSkills: project?.requiredSkills ?? [],
      projectType: project?.projectType ?? '',
      commitment: project?.commitment ?? '',
      compensation: project?.compensation ?? '',
      remote: project?.remote ?? true,
      location: project?.location ?? '',
    },
  });
  const remote = watch('remote');

  const onSubmit = async (values) => {
    try {
      const saved = project ? await updateProject({ id: project.id, ...values }).unwrap() : await createProject(values).unwrap();
      toast.success(project ? 'Project updated' : 'Collaboration request published');
      navigate(`/projects/${saved.id}`, { replace: true });
    } catch (error) {
      if (!applyFieldErrors(error, setError)) toast.error(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Card className="space-y-5 p-5 sm:p-7">
        <TextField id="title" label="Project title" required error={errors.title?.message} placeholder="e.g. Open-source Stripe webhook testing toolkit" {...register('title')} />
        <TextField id="summary" label="One-line summary" error={errors.summary?.message} placeholder="Who you're looking for, in a sentence" {...register('summary')} />
        <TextareaField id="description" label="Description" required error={errors.description?.message} className="[&_textarea]:min-h-44" placeholder="What are you building, where are you now, and what would a collaborator work on?" {...register('description')} />
        <FormField id="requiredSkills" label="Skills needed" required hint="Press Enter after each skill" error={errors.requiredSkills?.message}>
          {(fieldProps) => (
            <Controller control={control} name="requiredSkills" render={({ field }) => <TagInput {...fieldProps} value={field.value} onChange={field.onChange} max={12} />} />
          )}
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectField id="projectType" label="Type" required error={errors.projectType?.message} {...register('projectType')}>
            <option value="">Select…</option>
            {PROJECT_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectField>
          <SelectField id="commitment" label="Commitment" required error={errors.commitment?.message} {...register('commitment')}>
            <option value="">Select…</option>
            {PROJECT_COMMITMENTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectField>
          <SelectField id="compensation" label="Compensation" required error={errors.compensation?.message} {...register('compensation')}>
            <option value="">Select…</option>
            {PROJECT_COMPENSATION.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectField>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="size-4 accent-brand-600" {...register('remote')} />
          Fully remote
        </label>
        {!remote && <TextField id="location" label="Location" required error={errors.location?.message} placeholder="City, country" {...register('location')} />}
      </Card>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
        <Button type="submit" loading={creating || updating}>{project ? 'Save changes' : 'Publish project'}</Button>
      </div>
    </form>
  );
}

export default function ProjectEditorPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const isEditing = Boolean(id);
  useDocumentTitle(isEditing ? 'Edit project' : 'Post a project');
  const { data: project, isLoading, error, refetch } = useGetProjectQuery(id, { skip: !isEditing });

  if (!can(PERMISSIONS.PROJECT_CREATE)) {
    return (
      <div className="mx-auto max-w-2xl">
        <UpgradeCallout title="Posting projects is a Pro feature" description="Upgrade to publish collaboration requests. Anyone can express interest in existing projects." />
      </div>
    );
  }
  if (isEditing && isLoading) return <PageLoader />;
  if (isEditing && error) return <ErrorState error={error} onRetry={refetch} />;
  if (isEditing && !project.viewer.canEdit) return <ErrorState error="Only the author can edit this project." title="Editing isn't available" />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Project Match"
        title={isEditing ? 'Edit project' : 'Post a collaboration request'}
        description="Clear, specific requests get the best responses."
      />
      <ProjectForm key={project?.id ?? 'new'} project={isEditing ? project : null} />
    </div>
  );
}
