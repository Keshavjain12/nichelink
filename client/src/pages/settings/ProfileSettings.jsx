import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2, Upload } from 'lucide-react';
import { useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useGetConfigQuery } from '../../app/api';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { FormField, TextareaField, TextField } from '../../components/common/Field';
import { TagInput } from '../../components/common/Misc';
import { LIMITS } from '../../constants/content';
import {
  useRemoveAvatarMutation,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
} from '../../features/users/usersApi';
import { useAuth } from '../../hooks/useAuth';
import { applyFieldErrors, getErrorMessage } from '../../utils/errors';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  headline: z.string().trim().max(120),
  bio: z.string().trim().max(600),
  location: z.string().trim().max(80),
  website: z.union([
    z.literal(''),
    z
      .url('Enter a full URL, including https://')
      .refine((value) => /^https?:\/\//i.test(value), 'Use an http(s) link'),
  ]),
  skills: z.array(z.string()).max(20),
  interests: z.array(z.string()).max(20),
});

export default function ProfileSettings() {
  const { user } = useAuth();
  const fileRef = useRef(null);
  const { data: config } = useGetConfigQuery();
  const [updateProfile, { isLoading: saving }] = useUpdateProfileMutation();
  const [uploadAvatar, { isLoading: uploading }] = useUploadAvatarMutation();
  const [removeAvatar, { isLoading: removing }] = useRemoveAvatarMutation();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      headline: user.headline,
      bio: user.bio,
      location: user.location,
      website: user.website,
      skills: user.skills,
      interests: user.interests,
    },
  });
  const bio = watch('bio');

  const onSubmit = async (values) => {
    try {
      const { user: updated } = await updateProfile(values).unwrap();
      reset({
        name: updated.name,
        headline: updated.headline,
        bio: updated.bio,
        location: updated.location,
        website: updated.website,
        skills: updated.skills,
        interests: updated.interests,
      });
      toast.success('Profile updated');
    } catch (error) {
      if (!applyFieldErrors(error, setError)) toast.error(getErrorMessage(error));
    }
  };

  const onAvatarSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > LIMITS.MAX_IMAGE_BYTES) {
      toast.error('Images must be 5 MB or smaller');
      return;
    }
    try {
      await uploadAvatar(file).unwrap();
      toast.success('Avatar updated');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-semibold">Profile photo</h2>
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <Avatar user={user} size="xl" />
          <div className="space-y-2">
            {config?.features.uploads ? (
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  tabIndex={-1}
                  onChange={onAvatarSelected}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={Upload}
                  loading={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  Upload photo
                </Button>
                {user.avatarUrl && (
                  <Button
                    variant="danger-ghost"
                    size="sm"
                    leftIcon={Trash2}
                    loading={removing}
                    onClick={() =>
                      removeAvatar()
                        .unwrap()
                        .then(() => toast.success('Avatar removed'))
                        .catch((error) => toast.error(getErrorMessage(error)))
                    }
                  >
                    Remove
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-fg-subtle">
                Photo uploads are not configured on this server.
              </p>
            )}
            <p className="text-xs text-fg-subtle">
              JPEG, PNG, WebP or GIF, up to 5 MB. Cropped to a square.
            </p>
          </div>
          <div className="ml-auto min-w-40">
            <p className="text-xs font-medium text-fg-subtle">Profile completion</p>
            <div className="mt-1.5 flex items-center gap-2">
              <div
                className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted"
                role="progressbar"
                aria-valuenow={user.profileCompletion}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Profile completion"
              >
                <div
                  className="h-full rounded-full bg-linear-to-r from-brand-500 to-violet-500"
                  style={{ width: `${user.profileCompletion}%` }}
                />
              </div>
              <span className="text-sm font-semibold">{user.profileCompletion}%</span>
            </div>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card className="space-y-5 p-5 sm:p-6">
          <h2 className="text-base font-semibold">Public profile</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TextField
              id="name"
              label="Full name"
              required
              error={errors.name?.message}
              {...register('name')}
            />
            <TextField
              id="headline"
              label="Headline"
              placeholder="e.g. Staff Engineer · Payments"
              error={errors.headline?.message}
              {...register('headline')}
            />
            <TextField
              id="location"
              label="Location"
              placeholder="City, country"
              error={errors.location?.message}
              {...register('location')}
            />
            <TextField
              id="website"
              label="Website"
              type="url"
              placeholder="https://"
              error={errors.website?.message}
              {...register('website')}
            />
          </div>
          <div>
            <TextareaField
              id="bio"
              label="Bio"
              maxLength={600}
              error={errors.bio?.message}
              placeholder="What do you work on? What can people ask you about?"
              {...register('bio')}
            />
            <p className="mt-1 text-right text-xs text-fg-subtle">{bio.length}/600</p>
          </div>
          <FormField
            id="skills"
            label="Skills"
            hint="Used to recommend communities and match projects"
            error={errors.skills?.message}
          >
            {(fieldProps) => (
              <Controller
                control={control}
                name="skills"
                render={({ field }) => (
                  <TagInput
                    {...fieldProps}
                    value={field.value}
                    onChange={field.onChange}
                    max={20}
                  />
                )}
              />
            )}
          </FormField>
          <FormField id="interests" label="Interests" error={errors.interests?.message}>
            {(fieldProps) => (
              <Controller
                control={control}
                name="interests"
                render={({ field }) => (
                  <TagInput
                    {...fieldProps}
                    value={field.value}
                    onChange={field.onChange}
                    max={20}
                  />
                )}
              />
            )}
          </FormField>
          <div className="flex justify-end border-t border-line pt-5">
            <Button type="submit" loading={saving} disabled={!isDirty}>
              Save profile
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
