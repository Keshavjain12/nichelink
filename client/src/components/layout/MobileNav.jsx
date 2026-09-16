import { Bell, Briefcase, Compass, House, MessagesSquare } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useGetUnreadMessageCountQuery } from '../../features/messages/messagesApi';
import { useGetUnreadNotificationCountQuery } from '../../features/notifications/notificationsApi';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/misc';

function Tab({ to, icon: Icon, label, count }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
          isActive ? 'text-brand-600 dark:text-brand-400' : 'text-fg-subtle',
        )
      }
    >
      <Icon className="size-5" aria-hidden="true" />
      {label}
      {count > 0 && (
        <span className="absolute top-1 left-1/2 ml-2 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[10px] leading-4 font-bold text-white">
          {count > 9 ? '9+' : count}
          <span className="sr-only"> unread</span>
        </span>
      )}
    </NavLink>
  );
}

function AuthenticatedTabs() {
  const { data: unreadMessages = 0 } = useGetUnreadMessageCountQuery();
  const { data: unreadNotifications = 0 } = useGetUnreadNotificationCountQuery();
  return (
    <>
      <Tab to="/feed" icon={House} label="Home" />
      <Tab to="/communities" icon={Compass} label="Explore" />
      <Tab to="/messages" icon={MessagesSquare} label="Messages" count={unreadMessages} />
      <Tab to="/projects" icon={Briefcase} label="Projects" />
      <Tab to="/notifications" icon={Bell} label="Alerts" count={unreadNotifications} />
    </>
  );
}

export default function MobileNav() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;

  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <AuthenticatedTabs />
    </nav>
  );
}
