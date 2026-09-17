import { zodResolver } from '@hookform/resolvers/zod';
import { Check, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '../../components/common/Button';
import { InlineAlert } from '../../components/common/Feedback';
import { FormField, TextField } from '../../components/common/Field';
import { useRegisterMutation } from '../../features/auth/authApi';
import { useDocumentTitle } from '../../hooks/common';
import { applyFieldErrors, getErrorMessage } from '../../utils/errors';
import { safeRedirectPath } from '../../utils/navigation';
import { cn } from '../../utils/misc';
import AuthLayout from './AuthLayout';
import { PasswordInput } from './LoginPage';

const PASSWORD_RULES = [
  { test: (value) => value.length >= 8, label: 'At least 8 characters' },
  { test: (value) => /[a-z]/.test(value), label: 'A lowercase letter' },
  { test: (value) => /[A-Z]/.test(value), label: 'An uppercase letter' },
  { test: (value) => /\d/.test(value), label: 'A number' },
];

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80, 'Name is too long'),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'At least 3 characters')
    .max(30, 'At most 30 characters')
    .regex(/^[a-z0-9_]+$/, 'Use letters, numbers and underscores only'),
  email: z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email address')),
  password: z
    .string()
    .max(72, 'Password is too long')
    .refine(
      (value) => PASSWORD_RULES.every((rule) => rule.test(value)),
      'Password does not meet the requirements',
    ),
});

const suggestUsername = (name) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);

export default function RegisterPage() {
  useDocumentTitle('Create account');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [registerAccount, { isLoading, error }] = useRegisterMutation();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    getFieldState,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', username: '', email: '', password: '' },
  });
  const password = watch('password');

  const onSubmit = async (values) => {
    try {
      await registerAccount(values).unwrap();
      toast.success('Welcome to NicheLink! Join a few communities to personalise your feed.');
      navigate(safeRedirectPath(searchParams.get('redirect'), '/communities'), { replace: true });
    } catch (submitError) {
      applyFieldErrors(submitError, setError);
    }
  };

  const nameField = register('name');

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join free — upgrade to Pro whenever you want to post and collaborate."
      footer={
        <>
          Already a member?{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {error && !error.data?.errors?.length && (
          <InlineAlert variant="danger">{getErrorMessage(error)}</InlineAlert>
        )}

        <TextField
          id="name"
          label="Full name"
          autoComplete="name"
          error={errors.name?.message}
          {...nameField}
          onChange={(event) => {
            nameField.onChange(event);
            if (!getFieldState('username').isDirty)
              setValue('username', suggestUsername(event.target.value));
          }}
        />
        <TextField
          id="username"
          label="Username"
          autoComplete="username"
          hint="Your public @handle. Letters, numbers and underscores."
          error={errors.username?.message}
          {...register('username')}
        />
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <FormField id="password" label="Password" error={errors.password?.message}>
          {(fieldProps) => (
            <PasswordInput autoComplete="new-password" {...fieldProps} {...register('password')} />
          )}
        </FormField>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5" aria-label="Password requirements">
          {PASSWORD_RULES.map((rule) => {
            const passed = rule.test(password);
            return (
              <li
                key={rule.label}
                className={cn(
                  'flex items-center gap-1.5 text-xs',
                  passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-fg-subtle',
                )}
              >
                {passed ? (
                  <Check className="size-3.5" aria-hidden="true" />
                ) : (
                  <X className="size-3.5" aria-hidden="true" />
                )}
                {rule.label}
                <span className="sr-only">{passed ? '(met)' : '(not met)'}</span>
              </li>
            );
          })}
        </ul>

        <Button type="submit" className="w-full" size="lg" loading={isLoading}>
          Create account
        </Button>
        <p className="text-center text-xs text-fg-subtle">
          By joining you agree to follow each community's guidelines.
        </p>
      </form>
    </AuthLayout>
  );
}
