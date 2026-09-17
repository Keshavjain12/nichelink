import {
  Briefcase,
  LogIn,
  Menu as MenuIcon,
  MessagesSquare,
  PenSquare,
  Plus,
  Users,
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { Link, NavLink } from 'react-router-dom';
import { PERMISSIONS } from '../../constants/app';
import { useGetUnreadMessageCountQuery } from '../../features/messages/messagesApi';
import { mobileNavToggled } from '../../features/ui/uiSlice';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';
import { Menu, MenuItem } from '../common/Menu';
import { Logo } from '../common/Misc';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';

export function CountBadge({ count, label }) {
  if (!count) return null;
  return (
    <span
      className="absolute -top-0.5 -right-0.5 inline-flex min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-4.5 text-white ring-2 ring-surface"
      aria-label={label}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function MessagesLink() {
  const { data: unread = 0 } = useGetUnreadMessageCountQuery(undefined, {
    pollingInterval: 120_000,
  });
  return (
    <NavLink
      to="/messages"
      className={({ isActive }) =>
        `relative inline-flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-surface-hover ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-fg-muted'}`
      }
      aria-label={unread ? `Messages, ${unread} unread` : 'Messages'}
    >
      <MessagesSquare className="size-5" aria-hidden="true" />
      <CountBadge count={unread} />
    </NavLink>
  );
}

function CreateMenu() {
  const { can } = useAuth();
  const canPost = can(PERMISSIONS.POST_CREATE);
  const canCreateProject = can(PERMISSIONS.PROJECT_CREATE);

  return (
    <Menu
      label="Create"
      trigger={(props) => (
        <Button size="sm" leftIcon={Plus} className="max-sm:hidden" {...props}>
          Create
        </Button>
      )}
    >
      <MenuItem as={Link} to={canPost ? '/posts/new' : '/pricing'} icon={PenSquare}>
        {canPost ? 'New discussion' : 'New discussion (Pro)'}
      </MenuItem>
      <MenuItem as={Link} to={canCreateProject ? '/projects/new' : '/pricing'} icon={Briefcase}>
        {canCreateProject ? 'Collaboration request' : 'Collaboration request (Pro)'}
      </MenuItem>
      <MenuItem as={Link} to="/communities" icon={Users}>
        Find communities
      </MenuItem>
    </Menu>
  );
}

export default function TopBar() {
  const dispatch = useDispatch();
  const { isAuthenticated, isResolving } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation"
          onClick={() => dispatch(mobileNavToggled(true))}
        >
          <MenuIcon className="size-5" aria-hidden="true" />
        </Button>
        <Link
          to={isAuthenticated ? '/feed' : '/'}
          className="rounded-lg lg:w-60"
          aria-label="NicheLink home"
        >
          <Logo className="max-sm:hidden" />
          <Logo compact className="sm:hidden" />
        </Link>

        <div className="min-w-0 flex-1">
          <GlobalSearch />
        </div>

        <nav className="flex items-center gap-1" aria-label="Account">
          {isAuthenticated ? (
            <>
              <CreateMenu />
              <MessagesLink />
              <NotificationBell />
              <UserMenu />
            </>
          ) : (
            !isResolving && (
              <>
                <Button as={Link} to="/login" variant="ghost" size="sm" leftIcon={LogIn}>
                  <span className="hidden sm:inline">Sign in</span>
                </Button>
                <Button as={Link} to="/register" size="sm">
                  Join free
                </Button>
              </>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
