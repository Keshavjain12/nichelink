import DOMPurify from 'dompurify';
import { ChevronLeft, ChevronRight, Crown, X } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteScroll } from '../../hooks/common';
import { formatDate, formatRelativeTime } from '../../utils/format';
import { cn } from '../../utils/misc';
import { Button } from './Button';
import { Spinner } from './Feedback';

export function Logo({ className, compact = false }) {
  // Unique per instance: several logos can be on a page, and an SVG gradient referenced by id
  // does not render if the first element with that id sits inside a display:none subtree.
  const gradientId = `nl-logo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight text-fg', className)}>
      <svg viewBox="0 0 64 64" className="size-7 shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6366f1" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill={`url(#${gradientId})`} />
        <circle cx="22" cy="24" r="7" fill="#fff" />
        <circle cx="42" cy="40" r="7" fill="#fff" />
        <path d="M26 29 L38 35" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      </svg>
      {!compact && <span className="text-[17px]">NicheLink</span>}
    </span>
  );
}

export function RelativeTime({ value, className }) {
  if (!value) return null;
  return (
    <time dateTime={new Date(value).toISOString()} title={formatDate(value, { dateStyle: 'full', timeStyle: 'short' })} className={className}>
      {formatRelativeTime(value)}
    </time>
  );
}

export function PageHeader({ title, description, actions, eyebrow, className }) {
  return (
    <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Tag({ children, onRemove, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-fg-muted', className)}>
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} className="rounded hover:text-fg" aria-label={`Remove ${children}`}>
          <X className="size-3" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

/** Chip input for tags and skills. Enter or comma adds, Backspace on empty removes the last chip. */
export function TagInput({ id, value = [], onChange, max = 10, placeholder = 'Type and press Enter', ...props }) {
  const [draft, setDraft] = useState('');

  const add = (raw) => {
    const next = raw.trim().replace(/,$/, '');
    if (!next || value.length >= max) return;
    if (!value.some((item) => item.toLowerCase() === next.toLowerCase())) onChange([...value, next]);
    setDraft('');
  };

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1.5 shadow-sm focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-500/20">
      {value.map((item) => (
        <Tag key={item} onRemove={() => onChange(value.filter((existing) => existing !== item))}>
          {item}
        </Tag>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            add(draft);
          } else if (event.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => add(draft)}
        disabled={value.length >= max}
        placeholder={value.length >= max ? `Limit of ${max} reached` : placeholder}
        className="min-w-32 flex-1 bg-transparent px-1 text-sm text-fg outline-none placeholder:text-fg-subtle"
        {...props}
      />
    </div>
  );
}

const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h2', 'h3', 'blockquote', 'pre', 'code', 'ul', 'ol', 'li', 'a'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
};

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer nofollow');
  }
});

/** Renders server-sanitized HTML, sanitized again client-side as defence in depth. */
export function RichTextContent({ html, className }) {
  const clean = useMemo(() => DOMPurify.sanitize(html ?? '', PURIFY_CONFIG), [html]);
  return <div className={cn('rich-content', className)} dangerouslySetInnerHTML={{ __html: clean }} />;
}

export function UpgradeCallout({ title = 'Unlock with Pro', description, compact = false, className }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50 via-orange-50 to-white dark:border-amber-500/25 dark:from-amber-500/10 dark:via-orange-500/5 dark:to-transparent',
        compact ? 'p-4' : 'p-5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-orange-500 text-white shadow-sm">
          <Crown className="size-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">{title}</p>
          {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
          <Button as={Link} to="/pricing" variant="pro" size="sm" className="mt-3">
            See Pro plans
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Infinite-list footer: auto-loads on scroll with a keyboard-accessible button fallback. */
export function LoadMore({ hasNextPage, isFetchingNextPage, fetchNextPage, endLabel }) {
  const sentinelRef = useInfiniteScroll({
    enabled: Boolean(hasNextPage) && !isFetchingNextPage,
    onLoadMore: fetchNextPage,
  });

  if (!hasNextPage) {
    return endLabel ? <p className="py-6 text-center text-xs text-fg-subtle">{endLabel}</p> : null;
  }

  return (
    <div ref={sentinelRef} className="flex justify-center py-6">
      {isFetchingNextPage ? (
        <Spinner label="Loading more" />
      ) : (
        <Button variant="secondary" size="sm" onClick={() => fetchNextPage()}>
          Load more
        </Button>
      )}
    </div>
  );
}

export function Pagination({ page, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-4">
      <Button variant="secondary" size="sm" leftIcon={ChevronLeft} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </Button>
      <span className="text-sm text-fg-muted">
        Page <span className="font-medium text-fg">{page}</span> of {totalPages}
      </span>
      <Button variant="secondary" size="sm" rightIcon={ChevronRight} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Next
      </Button>
    </nav>
  );
}

export function StatPill({ icon: Icon, children, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-fg-subtle', className)}>
      {Icon && <Icon className="size-3.5" aria-hidden="true" />}
      {children}
    </span>
  );
}
