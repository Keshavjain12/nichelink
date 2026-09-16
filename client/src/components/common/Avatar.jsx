import { useSelector } from 'react-redux';
import { selectIsOnline } from '../../features/realtime/realtimeSlice';
import { initials } from '../../utils/format';
import { cn, colorForSeed } from '../../utils/misc';

const SIZES = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
  xl: 'size-24 text-3xl',
};

const DOT_SIZES = { xs: 'size-2', sm: 'size-2.5', md: 'size-3', lg: 'size-3.5', xl: 'size-5' };

export function Avatar({ user, size = 'md', showPresence = false, className }) {
  const isOnline = useSelector(selectIsOnline(showPresence ? user?.id : null));
  const name = user?.name ?? 'Member';

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {user?.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt=""
          loading="lazy"
          className={cn('rounded-full object-cover ring-1 ring-line', SIZES[size])}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex items-center justify-center rounded-full font-semibold text-white',
            SIZES[size],
            colorForSeed(user?.username ?? name),
          )}
        >
          {initials(name)}
        </span>
      )}
      {showPresence && (
        <span
          className={cn(
            'absolute right-0 bottom-0 rounded-full ring-2 ring-surface',
            DOT_SIZES[size],
            isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600',
          )}
          role="status"
          aria-label={isOnline ? `${name} is online` : `${name} is offline`}
        />
      )}
    </span>
  );
}
