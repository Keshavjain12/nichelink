import { Bell, Briefcase, Compass, Crown, House, LayoutDashboard, MessagesSquare, Settings } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useGetMyCommunitiesQuery } from '../../features/communities/communitiesApi';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/misc';
import { Skeleton } from '../common/Feedback';
import { Logo } from '../common/Misc';

const navClass = ({ isActive }) =>
  cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
      : 'text-fg-muted hover:bg-surface-hover hover:text-fg',
  );

function NavItem({ to, icon: Icon, children, end }) {
  return (
    <NavLink to={to} end={end} className={navClass}>
      <Icon className="size-[18px]" aria-hidden="true" />
      {children}
    </NavLink>
  );
}

function MyCommunities() {
  const { data: communities, isLoading } = useGetMyCommunitiesQuery();

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between px-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Your communities</h2>
        <Link to="/communities" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
          Browse
        </Link>
      </div>
      <ul className="mt-2 space-y-0.5">
        {isLoading &&
          Array.from({ length: 4 }, (_, index) => (
            <li key={index} className="flex items-center gap-3 px-3 py-2">
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="h-3 flex-1" />
            </li>
          ))}
        {communities?.length === 0 && (
          <li className="px-3 py-2 text-xs text-fg-subtle">Join a community to see it here.</li>
        )}
        {communities?.slice(0, 12).map((community) => (
          <li key={community.id}>
            <NavLink to={`/communities/${community.slug}`} className={navClass}>
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-sm"
                style={{ backgroundColor: `${community.accentColor}1f` }}
                aria-hidden="true"
              >
                {community.icon}
              </span>
              <span className="truncate">{community.name}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Sidebar() {
  const { isAuthenticated, isAdmin, isPro } = useAuth();

  return (
    <nav aria-label="Primary" className="flex h-full flex-col">
      <Link to="/" className="mb-5 px-3 lg:hidden" aria-label="NicheLink home">
        <Logo />
      </Link>

      <div className="space-y-0.5">
        {isAuthenticated && (
          <NavItem to="/feed" icon={House}>
            Home
          </NavItem>
        )}
        <NavItem to="/communities" icon={Compass}>
          Communities
        </NavItem>
        {isAuthenticated && (
          <>
            <NavItem to="/messages" icon={MessagesSquare}>
              Messages
            </NavItem>
            <NavItem to="/projects" icon={Briefcase}>
              Project Match
            </NavItem>
            <NavItem to="/notifications" icon={Bell}>
              Notifications
            </NavItem>
            <NavItem to="/settings/profile" icon={Settings}>
              Settings
            </NavItem>
          </>
        )}
        {isAdmin && (
          <NavItem to="/admin" icon={LayoutDashboard}>
            Admin
          </NavItem>
        )}
      </div>

      {isAuthenticated && <MyCommunities />}

      {!isPro && !isAdmin && (
        <Link
          to="/pricing"
          className="mt-6 block rounded-xl border border-amber-200 bg-linear-to-br from-amber-50 to-orange-50 p-4 transition-shadow hover:shadow-card dark:border-amber-500/20 dark:from-amber-500/10 dark:to-orange-500/5"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
            <Crown className="size-4" aria-hidden="true" />
            NicheLink Pro
          </span>
          <span className="mt-1 block text-xs text-amber-900/70 dark:text-amber-100/70">
            Post, message without limits and unlock private communities.
          </span>
        </Link>
      )}

      <p className="mt-auto px-3 pt-6 text-xs text-fg-subtle">© {new Date().getFullYear()} NicheLink</p>
    </nav>
  );
}
