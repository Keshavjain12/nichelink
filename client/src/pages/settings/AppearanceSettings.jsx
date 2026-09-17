import { Monitor, Moon, Sun } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../utils/misc';

const OPTIONS = [
  { value: 'light', label: 'Light', description: 'Bright surfaces for daytime work', icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Easy on the eyes at night', icon: Moon },
  { value: 'system', label: 'System', description: 'Follow your device setting', icon: Monitor },
];

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-base font-semibold">Theme</h2>
      <p className="mt-1 text-sm text-fg-muted">Saved on this device.</p>
      <div role="radiogroup" aria-label="Theme" className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={theme === option.value}
            onClick={() => setTheme(option.value)}
            className={cn(
              'rounded-xl border p-4 text-left transition-colors',
              theme === option.value ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20 dark:bg-brand-500/10' : 'border-line hover:border-line-strong',
            )}
          >
            <option.icon className="size-5 text-brand-600 dark:text-brand-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold">{option.label}</p>
            <p className="mt-0.5 text-xs text-fg-subtle">{option.description}</p>
          </button>
        ))}
      </div>
    </Card>
  );
}
