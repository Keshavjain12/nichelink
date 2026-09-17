import { NavLink } from 'react-router-dom';
import { cn } from '../../utils/misc';

const tabClass = (active) =>
  cn(
    'relative inline-flex h-10 items-center gap-2 whitespace-nowrap px-1 text-sm font-medium transition-colors',
    'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full',
    active ? 'text-fg after:bg-brand-600' : 'text-fg-subtle hover:text-fg after:bg-transparent',
  );

function Count({ value }) {
  if (value === undefined || value === null) return null;
  return (
    <span className="rounded-full bg-surface-muted px-1.5 text-xs text-fg-muted">{value}</span>
  );
}

/** Stateful tabs for in-page filters. */
export function Tabs({ tabs, value, onChange, label, className }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('flex gap-6 overflow-x-auto border-b border-line', className)}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={tab.value === value}
          onClick={() => onChange(tab.value)}
          className={tabClass(tab.value === value)}
        >
          {tab.icon && <tab.icon className="size-4" aria-hidden="true" />}
          {tab.label}
          <Count value={tab.count} />
        </button>
      ))}
    </div>
  );
}

/** Route-backed tabs. */
export function NavTabs({ tabs, label, className }) {
  return (
    <nav
      aria-label={label}
      className={cn('flex gap-6 overflow-x-auto border-b border-line', className)}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => tabClass(isActive)}
        >
          {tab.icon && <tab.icon className="size-4" aria-hidden="true" />}
          {tab.label}
          <Count value={tab.count} />
        </NavLink>
      ))}
    </nav>
  );
}

/** Compact pill switcher (e.g. sort order). */
export function SegmentedControl({ options, value, onChange, label, className }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex rounded-lg bg-surface-muted p-0.5', className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
            option.value === value
              ? 'bg-surface text-fg shadow-card'
              : 'text-fg-subtle hover:text-fg',
          )}
        >
          {option.icon && <option.icon className="size-3.5" aria-hidden="true" />}
          {option.label}
        </button>
      ))}
    </div>
  );
}
