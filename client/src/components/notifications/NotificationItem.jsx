import { AtSign, Briefcase, Crown, Heart, MessageCircle, MessagesSquare, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMarkNotificationReadMutation } from '../../features/notifications/notificationsApi';
import { cn } from '../../utils/misc';
import { Avatar } from '../common/Avatar';
import { RelativeTime } from '../common/Misc';

const TYPE_ICONS = {
  message: MessagesSquare,
  post_comment: MessageCircle,
  comment_reply: AtSign,
  post_reaction: Heart,
  project_interest: Briefcase,
  project_interest_update: Briefcase,
  subscription: Crown,
  moderation: ShieldCheck,
  account: Sparkles,
};

function notificationText(notification) {
  if (!notification.actor) return notification.title;
  const others = notification.count > 1 ? ` and ${notification.count - 1} other${notification.count > 2 ? 's' : ''}` : '';
  return (
    <>
      <span className="font-semibold text-fg">{notification.actor.name}</span>
      {others} {notification.title}
    </>
  );
}

export default function NotificationItem({ notification, onNavigate, compact = false }) {
  const navigate = useNavigate();
  const [markRead] = useMarkNotificationReadMutation();
  const Icon = TYPE_ICONS[notification.type] ?? Sparkles;

  const open = () => {
    if (!notification.isRead) markRead(notification.id);
    onNavigate?.();
    if (notification.link) navigate(notification.link);
  };

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl text-left transition-colors hover:bg-surface-hover',
        compact ? 'px-3 py-2.5' : 'px-4 py-3.5',
        !notification.isRead && 'bg-brand-50/60 dark:bg-brand-500/5',
      )}
    >
      <span className="relative">
        {notification.actor ? (
          <Avatar user={notification.actor} size={compact ? 'sm' : 'md'} />
        ) : (
          <span className={cn('inline-flex items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300', compact ? 'size-8' : 'size-10')}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
        {notification.actor && (
          <span className="absolute -right-1 -bottom-1 inline-flex size-5 items-center justify-center rounded-full bg-surface text-brand-600 ring-1 ring-line dark:text-brand-400">
            <Icon className="size-3" aria-hidden="true" />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-5 text-fg-muted">{notificationText(notification)}</span>
        {notification.body && <span className="mt-0.5 line-clamp-2 block text-sm text-fg-subtle">{notification.body}</span>}
        <RelativeTime value={notification.updatedAt} className="mt-1 block text-xs text-fg-subtle" />
      </span>
      {!notification.isRead && (
        <span className="mt-2 size-2 shrink-0 rounded-full bg-brand-500">
          <span className="sr-only">Unread</span>
        </span>
      )}
    </button>
  );
}
