import { CreditCard, KeyRound, Palette, UserRound } from 'lucide-react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { PageHeader } from '../../components/common/Misc';
import { useDocumentTitle } from '../../hooks/common';
import { cn } from '../../utils/misc';
import AccountSettings from './AccountSettings';
import AppearanceSettings from './AppearanceSettings';
import BillingSettings from './BillingSettings';
import ProfileSettings from './ProfileSettings';

const SECTIONS = [
  { to: 'profile', label: 'Profile', icon: UserRound },
  { to: 'account', label: 'Account & security', icon: KeyRound },
  { to: 'billing', label: 'Plan & billing', icon: CreditCard },
  { to: 'appearance', label: 'Appearance', icon: Palette },
];

export default function SettingsPage() {
  useDocumentTitle('Settings');
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Settings" description="Manage your profile, security, plan and preferences." />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:px-0">
          {SECTIONS.map((section) => (
            <NavLink
              key={section.to}
              to={section.to}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-surface text-fg shadow-card' : 'text-fg-muted hover:bg-surface-hover hover:text-fg',
                )
              }
            >
              <section.icon className="size-4" aria-hidden="true" />
              {section.label}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0">
          <Routes>
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<ProfileSettings />} />
            <Route path="account" element={<AccountSettings />} />
            <Route path="billing" element={<BillingSettings />} />
            <Route path="appearance" element={<AppearanceSettings />} />
            <Route path="*" element={<Navigate to="profile" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
