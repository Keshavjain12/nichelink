import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { FormField, Input, Label } from '../../components/common/Field';
import { useChangePasswordMutation } from '../../features/auth/authApi';
import { useAuth } from '../../hooks/useAuth';
import { applyFieldErrors, getErrorMessage } from '../../utils/errors';
import { PasswordInput } from '../auth/LoginPage';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .max(72, 'Password is too long')
      .regex(/[a-z]/, 'Include a lowercase letter')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/\d/, 'Include a number'),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ['newPassword'],
    message: 'Choose a different password',
  });

export default function AccountSettings() {
  const { user } = useAuth();
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async ({ currentPassword, newPassword }) => {
    try {
      await changePassword({ currentPassword, newPassword }).unwrap();
      reset();
      toast.success('Password updated. Other devices have been signed out.');
    } catch (error) {
      if (!applyFieldErrors(error, setError)) toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5 sm:p-6">
        <h2 className="text-base font-semibold">Account</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="account-email">Email</Label>
            <Input id="account-email" value={user.email} readOnly disabled />
          </div>
          <div>
            <Label htmlFor="account-username">Username</Label>
            <Input id="account-username" value={`@${user.username}`} readOnly disabled />
          </div>
        </div>
        <p className="text-xs text-fg-subtle">
          Email and username changes are handled by support to protect your account.
        </p>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card className="space-y-5 p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold">Change password</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Changing your password signs you out of every other device.
            </p>
          </div>
          <FormField
            id="currentPassword"
            label="Current password"
            error={errors.currentPassword?.message}
          >
            {(fieldProps) => (
              <PasswordInput
                autoComplete="current-password"
                {...fieldProps}
                {...register('currentPassword')}
              />
            )}
          </FormField>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              id="newPassword"
              label="New password"
              hint="8+ characters with upper, lower case and a number"
              error={errors.newPassword?.message}
            >
              {(fieldProps) => (
                <PasswordInput
                  autoComplete="new-password"
                  {...fieldProps}
                  {...register('newPassword')}
                />
              )}
            </FormField>
            <FormField
              id="confirmPassword"
              label="Confirm new password"
              error={errors.confirmPassword?.message}
            >
              {(fieldProps) => (
                <PasswordInput
                  autoComplete="new-password"
                  {...fieldProps}
                  {...register('confirmPassword')}
                />
              )}
            </FormField>
          </div>
          <div className="flex justify-end border-t border-line pt-5">
            <Button type="submit" loading={isLoading}>
              Update password
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
