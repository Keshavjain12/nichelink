import { Search } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetSearchSuggestionsQuery } from '../../features/users/usersApi';
import { useDebouncedValue, useDismiss } from '../../hooks/common';
import { cn } from '../../utils/misc';
import { Avatar } from '../common/Avatar';

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const listId = useId();
  const debounced = useDebouncedValue(query.trim(), 250);
  useDismiss(containerRef, () => setOpen(false), open);

  const { data } = useGetSearchSuggestionsQuery(debounced, { skip: debounced.length < 2 });
  const suggestions = [
    ...(data?.communities ?? []).map((community) => ({
      key: `c-${community.id}`,
      to: `/communities/${community.slug}`,
      label: community.name,
      meta: `${community.memberCount} members`,
      icon: <span className="flex size-7 items-center justify-center rounded-lg bg-surface-muted text-sm">{community.icon}</span>,
    })),
    ...(data?.users ?? []).map((user) => ({
      key: `u-${user.id}`,
      to: `/profile/${user.username}`,
      label: user.name,
      meta: `@${user.username}`,
      icon: <Avatar user={user} size="xs" />,
    })),
  ];
  const showList = open && debounced.length >= 2;

  const go = (to) => {
    setOpen(false);
    setQuery('');
    navigate(to);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, -1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) go(suggestions[activeIndex].to);
      else if (query.trim()) go(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-md">
      <label htmlFor="global-search" className="sr-only">
        Search NicheLink
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
      <input
        id="global-search"
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off"
        placeholder="Search communities, people, posts…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="h-9 w-full rounded-lg border border-transparent bg-surface-muted pr-3 pl-9 text-sm text-fg placeholder:text-fg-subtle focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-3 focus:ring-brand-500/20"
      />

      {showList && (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-11 z-50 animate-fade-in overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-elevated"
        >
          {suggestions.map((item, index) => (
            <div
              key={item.key}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => {
                event.preventDefault();
                go(item.to);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2',
                index === activeIndex && 'bg-surface-hover',
              )}
            >
              {item.icon}
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{item.label}</span>
              <span className="text-xs text-fg-subtle">{item.meta}</span>
            </div>
          ))}
          <div
            role="option"
            aria-selected={activeIndex === -1}
            onMouseDown={(event) => {
              event.preventDefault();
              go(`/search?q=${encodeURIComponent(query.trim())}`);
            }}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-brand-600 hover:bg-surface-hover dark:text-brand-400"
          >
            <Search className="size-4" aria-hidden="true" />
            Search for “{query.trim()}”
          </div>
        </div>
      )}
    </div>
  );
}
