import { z } from 'zod';
import { booleanQuery, paginationQuery } from './common.js';

export const searchQuery = paginationQuery.extend({
  q: z.string().trim().min(1, 'Enter a search term').max(100),
  type: z.enum(['all', 'communities', 'users', 'posts', 'projects']).default('all'),
});

export const suggestionsQuery = z.object({ q: z.string().trim().min(1).max(60) });

export const listNotificationsQuery = paginationQuery.extend({ unread: booleanQuery.optional() });
