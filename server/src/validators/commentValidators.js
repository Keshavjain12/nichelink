import { z } from 'zod';
import { CONTENT_LIMITS } from '../constants/content.js';
import { objectId, paginationQuery } from './common.js';

const content = z.string().trim().min(1, 'Comment cannot be empty').max(CONTENT_LIMITS.COMMENT_MAX);

export const createCommentBody = z.object({ content, parentId: objectId.optional() });

export const updateCommentBody = z.object({ content });

export const listCommentsQuery = paginationQuery.extend({
  sort: z.enum(['oldest', 'newest']).default('oldest'),
});
