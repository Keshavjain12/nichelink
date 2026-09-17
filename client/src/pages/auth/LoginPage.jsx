import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '../../components/common/Button';
import { InlineAlert } from '../../components/common/Feedback';
import { FormField, Input, TextField } from '../../components/common/Field';
import { SHOW_DEMO_ACCOUNTS } from '../../constants/app';
import { useLoginMutation } from '../../features/auth/authApi';
import { useDocumentTitle } from '../../hooks/common';
import { getErrorMessage } from '../../utils/errors';
import { safeRedirectPath } from '../../utils/navigation';
import AuthLayout from './AuthLayout';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email address')),
  password: z.string().min(1, 'Password is required'),
});

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@nichelink.demo' },
  { label: 'Pro', email: 'pro@nichelink.demo' },
  { label: 'Free', email: 'free@nichelink.demo' },
];

export function PasswordInput({ ref, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={visible ? 'text' : 'password'} className="pr-10" {...props} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-fg-subtle hover:text-fg"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [login, { isLoading, error }] = useLoginMutation();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (values) => {
    try {
      const { user } = await login(values).unwrap();
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(safeRedirectPath(searchParams.get('redirect')), { replace: true });
    } catch {
      // Rendered below from the mutation error state.
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue the conversation."
      footer={
        <>
          New to NicheLink?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Create a free account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {error && <InlineAlert variant="danger">{getErrorMessage(error)}</InlineAlert>}

        <TextField id="email" label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />

        <FormField id="password" label="Password" error={errors.password?.message}>
          {(fieldProps) => <PasswordInput autoComplete="current-password" {...fieldProps} {...register('password')} />}
        </FormField>

        <Button type="submit" className="w-full" size="lg" loading={isLoading}>
          Sign in
        </Button>
      </form>

      {SHOW_DEMO_ACCOUNTS && (
        <div className="mt-8 rounded-xl border border-dashed border-line-strong p-4">
          <p className="text-xs font-semibold text-fg">Demo accounts</p>
          <p className="mt-0.5 text-xs text-fg-subtle">Fill an account seeded by <code className="font-mono">npm run seed</code>. The password is in the README.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                variant="secondary"
                size="xs"
                onClick={() => setValue('email', account.email, { shouldValidate: true })}
              >
                {account.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
