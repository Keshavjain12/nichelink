import { Bell, CheckCheck } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useGetUnreadNotificationCountQuery,
  useListNotificationsInfiniteQuery,
  useMarkAllNotificationsReadMutation,
} from '../../features/notifications/notificationsApi';
import { useDismiss } from '../../hooks/common';
import { Button } from '../common/Button';
import { EmptyState, Skeleton } from '../common/Feedback';
import NotificationItem from '../notifications/NotificationItem';
import { CountBadge } from './TopBar';

function NotificationPanel({ onNavigate }) {
  const { data, isLoading } = useListNotificationsInfiniteQuery({});
  const [markAllRead, { isLoading: marking }] = useMarkAllNotificationsReadMutation();
  const items = (data?.pages ?? []).flatMap((page) => page.items).slice(0, 8);

  return (
    <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] animate-fade-in overflow-hidden rounded-2xl border border-line bg-surface shadow-elevated">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold">Notifications</h2>
        <Button
          variant="ghost"
          size="xs"
          leftIcon={CheckCheck}
          loading={marking}
          onClick={() => markAllRead()}
        >
          Mark all read
        </Button>
      </div>
      <div className="max-h-[26rem] overflow-y-auto p-1">
        {isLoading &&
          Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex gap-3 px-3 py-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        {!isLoading && items.length === 0 && (
          <EmptyState
            icon={Bell}
            title="You're all caught up"
            description="Replies, likes and messages will show up here."
            className="py-8"
          />
        )}
        {items.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onNavigate={onNavigate}
            compact
          />
        ))}
      </div>
      <Link
        to="/notifications"
        onClick={onNavigate}
        className="block border-t border-line px-4 py-2.5 text-center text-sm font-medium text-brand-600 hover:bg-surface-hover dark:text-brand-400"
      >
        View all notifications
      </Link>
    </div>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const { data: unread = 0 } = useGetUnreadNotificationCountQuery(undefined, {
    pollingInterval: 120_000,
  });
  useDismiss(containerRef, () => setOpen(false), open);

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className="relative"
      >
        <Bell className="size-5" aria-hidden="true" />
        <CountBadge count={unread} />
      </Button>
      {open && <NotificationPanel onNavigate={() => setOpen(false)} />}
    </div>
  );
}
