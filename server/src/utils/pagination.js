/**
 * Page-based pagination that avoids a count query: fetch `limit + 1` rows and
 * derive `hasMore` from whether the extra row came back.
 */
export function toPageWindow({ page = 1, limit = 20 }) {
  return { page, limit, skip: (page - 1) * limit, fetchLimit: limit + 1 };
}

export function splitPage(rows, { page, limit }) {
  const hasMore = rows.length > limit;
  return {
    items: hasMore ? rows.slice(0, limit) : rows,
    meta: { page, limit, hasMore },
  };
}

export function buildCountedMeta({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasMore: page * limit < total,
  };
}
