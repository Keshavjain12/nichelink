import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useDismiss } from '../../hooks/common';
import { cn } from '../../utils/misc';

const GAP_PX = 6;

/** Bottom edge of the nearest ancestor that clips overflow, or the viewport. */
function clippingBottom(element) {
  let bottom = window.innerHeight;
  for (
    let node = element?.parentElement;
    node && node !== document.body;
    node = node.parentElement
  ) {
    const { overflowX, overflowY } = getComputedStyle(node);
    if (overflowX !== 'visible' || overflowY !== 'visible') {
      bottom = Math.min(bottom, node.getBoundingClientRect().bottom);
      break;
    }
  }
  return bottom;
}

/** Accessible dropdown menu with arrow-key navigation. */
export function Menu({ label, trigger, children, align = 'end', className, menuClassName }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();
  useDismiss(containerRef, () => setOpen(false), open);

  // Open upwards when the menu would be cut off by a scroll container (e.g. the last rows of a
  // table) or the bottom of the viewport. Applied as inline style so no re-render is needed.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    const container = containerRef.current;
    if (!open || !menu || !container) return;
    const menuHeight = menu.getBoundingClientRect().height;
    const triggerRect = container.getBoundingClientRect();
    const roomBelow = clippingBottom(container) - triggerRect.bottom;
    if (roomBelow < menuHeight + GAP_PX && triggerRect.top > menuHeight + GAP_PX) {
      Object.assign(menu.style, {
        top: 'auto',
        bottom: '100%',
        marginTop: '0',
        marginBottom: `${GAP_PX}px`,
      });
    }
  }, [open]);

  useEffect(() => {
    if (open) menuRef.current?.querySelector('[role="menuitem"]:not([disabled])')?.focus();
  }, [open]);

  const onKeyDown = (event) => {
    const items = [
      ...(menuRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') ?? []),
    ];
    const index = items.indexOf(document.activeElement);
    const moves = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: items.length - 1 };
    if (event.key in moves) {
      event.preventDefault();
      items[(moves[event.key] + items.length) % items.length]?.focus();
    }
    if (event.key === 'Tab') setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {trigger({
        'aria-label': label,
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': open ? menuId : undefined,
        onClick: () => setOpen((value) => !value),
      })}
      {open && (
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          onClick={() => setOpen(false)}
          className={cn(
            'absolute z-40 mt-1.5 min-w-48 animate-fade-in overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-elevated',
            align === 'end' ? 'right-0' : 'left-0',
            menuClassName,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  as: Component = 'button',
  icon: Icon,
  danger = false,
  className,
  children,
  ...props
}) {
  return (
    <Component
      role="menuitem"
      type={Component === 'button' ? 'button' : undefined}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors focus:outline-none',
        danger
          ? 'text-rose-600 hover:bg-rose-50 focus:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:focus:bg-rose-500/10'
          : 'text-fg hover:bg-surface-hover focus:bg-surface-hover',
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="size-4 shrink-0 opacity-80" aria-hidden="true" />}
      {children}
    </Component>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-line" />;
}
