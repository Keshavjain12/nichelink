import { cn } from '../../utils/misc';

export function Card({ as: Component = 'div', className, children, ...props }) {
  return (
    <Component className={cn('rounded-2xl border border-line bg-surface shadow-card', className)} {...props}>
      {children}
    </Component>
  );
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-5 pt-5', className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-fg-subtle">{description}</p>}
      </div>
      {action}
    </div>
  );
}
