import { Crown, LayoutDashboard, LogOut, Monitor, Moon, Settings, Sun, UserRound } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { signOut } from '../../features/auth/sessionThunks';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from '../common/Avatar';
import { Menu, MenuItem, MenuSeparator } from '../common/Menu';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function UserMenu() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAdmin, isPro } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    try {
      await dispatch(signOut());
      toast.success('Signed out');
    } finally {
      navigate('/');
    }
  };

  return (
    <Menu
      label="Account menu"
      trigger={(props) => (
        <button type="button" className="ml-1 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2" {...props}>
          <Avatar user={user} size="sm" />
        </button>
      )}
      menuClassName="w-64"
    >
      <div className="px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-fg">{user.name}</p>
        <p className="truncate text-xs text-fg-subtle">{user.email}</p>
      </div>
      <MenuSeparator />
      <MenuItem as={Link} to={`/profile/${user.username}`} icon={UserRound}>
        Your profile
      </MenuItem>
      <MenuItem as={Link} to="/settings/profile" icon={Settings}>
        Settings
      </MenuItem>
      {!isPro && !isAdmin && (
        <MenuItem as={Link} to="/pricing" icon={Crown} className="text-amber-700 dark:text-amber-300">
          Upgrade to Pro
        </MenuItem>
      )}
      {isAdmin && (
        <MenuItem as={Link} to="/admin" icon={LayoutDashboard}>
          Admin dashboard
        </MenuItem>
      )}
      <MenuSeparator />
      <div className="px-3 pt-1.5 pb-1 text-xs font-medium text-fg-subtle">Theme</div>
      <div className="grid grid-cols-3 gap-1 px-1 pb-1">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="menuitemradio"
            aria-checked={theme === option.value}
            onClick={(event) => {
              event.stopPropagation();
              setTheme(option.value);
            }}
            className={`flex flex-col items-center gap-1 rounded-lg py-2 text-xs transition-colors ${theme === option.value ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300' : 'text-fg-muted hover:bg-surface-hover'}`}
          >
            <option.icon className="size-4" aria-hidden="true" />
            {option.label}
          </button>
        ))}
      </div>
      <MenuSeparator />
      <MenuItem icon={LogOut} onClick={handleSignOut}>
        Sign out
      </MenuItem>
    </Menu>
  );
}
