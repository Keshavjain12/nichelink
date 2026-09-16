import { Crown, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '../../utils/misc';

const VARIANTS = {
  neutral: 'bg-surface-muted text-fg-muted ring-line',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30',
  pro: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
  admin: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
  warning: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/30',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30',
};

export function Badge({ variant = 'neutral', icon: Icon, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap',
        VARIANTS[variant],
        className,
      )}
    >
      {Icon && <Icon className="size-3" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function UserBadges({ user }) {
  if (!user) return null;
  return (
    <>
      {user.isAdmin && (
        <Badge variant="admin" icon={ShieldCheck}>
          Admin
        </Badge>
      )}
      {user.isPro && (
        <Badge variant="pro" icon={Crown}>
          Pro
        </Badge>
      )}
    </>
  );
}

export function ProCommunityBadge() {
  return (
    <Badge variant="pro" icon={Lock}>
      Pro
    </Badge>
  );
}
