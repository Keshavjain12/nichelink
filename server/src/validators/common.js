import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const idParams = z.object({ id: objectId });

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const searchTerm = z.string().trim().max(100);

const TAG_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} .+#&/-]*$/u;

export const tagList = (max) =>
  z
    .array(z.string().trim().min(1).max(40).regex(TAG_PATTERN, 'Tags may contain letters, numbers and - . + # & /'))
    .max(max, `At most ${max} items`)
    .default([]);

/** Comma separated query value → array (e.g. ?skills=react,node). */
export const csvQuery = (max = 10) =>
  z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) =>
      value
        ? value
            .split(',')
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean)
            .slice(0, max)
        : [],
    );

export const booleanQuery = z.enum(['true', 'false']).transform((value) => value === 'true');
