import { z } from 'zod';
import { CONTENT_LIMITS } from '../constants/content.js';
import { usernameSchema } from './authValidators.js';
import { communityRef } from './communityValidators.js';
import { objectId, paginationQuery, searchTerm, tagArray, tagList } from './common.js';

const imageSchema = z.object({
  url: z.url().max(500),
  publicId: z.string().min(1).max(200),
  width: z.number().int().positive().nullish(),
  height: z.number().int().positive().nullish(),
});

const title = z
  .string()
  .trim()
  .min(
    CONTENT_LIMITS.POST_TITLE_MIN,
    `Title must be at least ${CONTENT_LIMITS.POST_TITLE_MIN} characters`,
  )
  .max(CONTENT_LIMITS.POST_TITLE_MAX);
const content = z
  .string()
  .min(1, 'Content is required')
  .max(CONTENT_LIMITS.POST_CONTENT_MAX_HTML, 'Post is too long');
const images = z
  .array(imageSchema)
  .max(CONTENT_LIMITS.POST_MAX_IMAGES, `At most ${CONTENT_LIMITS.POST_MAX_IMAGES} images`);

export const createPostBody = z.object({
  community: communityRef,
  title,
  content,
  tags: tagList(CONTENT_LIMITS.POST_MAX_TAGS),
  images: images.default([]),
});

export const updatePostBody = z
  .object({ title, content, tags: tagArray(CONTENT_LIMITS.POST_MAX_TAGS), images })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');

export const deletePostBody = z
  .object({ reason: z.string().trim().max(300).optional() })
  .optional()
  .default({});

export const listPostsQuery = paginationQuery.extend({
  community: communityRef.optional(),
  author: usernameSchema.optional(),
  tag: z.string().trim().toLowerCase().max(40).optional(),
  sort: z.enum(['latest', 'top', 'trending']).default('latest'),
  scope: z.enum(['all', 'joined']).default('all'),
  q: searchTerm.optional(),
});

export const postIdParams = z.object({ id: objectId });
