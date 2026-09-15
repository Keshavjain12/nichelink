export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function truncate(value, maxLength) {
  if (!value || value.length <= maxLength) return value ?? '';
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export function normalizeTags(tags = []) {
  return [...new Set(tags.map((tag) => slugify(tag)).filter(Boolean))];
}
