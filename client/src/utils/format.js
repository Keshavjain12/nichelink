const DIVISIONS = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
];

const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'short' });
const compactFormatter = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatRelativeTime(value, now = Date.now()) {
  if (!value) return '';
  let duration = (new Date(value).getTime() - now) / 1000;
  if (Math.abs(duration) < 45) return 'just now';

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return relativeFormatter.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return '';
}

export function formatDate(value, options = { dateStyle: 'medium' }) {
  return value ? new Intl.DateTimeFormat('en', options).format(new Date(value)) : '';
}

export function formatTime(value) {
  return value
    ? new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
    : '';
}

export function formatCompactNumber(value) {
  return compactFormatter.format(value ?? 0);
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${formatCompactNumber(count)} ${count === 1 ? singular : plural}`;
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function isSameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function formatDayLabel(value) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';
  return formatDate(date, { weekday: 'long', month: 'short', day: 'numeric' });
}

export function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    trailingZeroDisplay: 'stripIfInteger',
  }).format(amount);
}

/** Stripe billing interval as a phrase: `month`, `3 months`. */
export function formatBillingInterval(interval, intervalCount = 1) {
  return intervalCount === 1 ? interval : `${intervalCount} ${interval}s`;
}
