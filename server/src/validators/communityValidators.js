import { z } from 'zod';
import { COMMUNITY_CATEGORIES } from '../constants/content.js';
import { COMMUNITY_ACCESS } from '../constants/roles.js';
import { booleanQuery, paginationQuery, searchTerm, tagArray } from './common.js';

export const communityRef = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^(?:[a-f0-9]{24}|[a-z0-9]+(?:-[a-z0-9]+)*)$/i, 'Invalid community reference');

export const communityParams = z.object({ community: communityRef });

export const listCommunitiesQuery = paginationQuery.extend({
  q: searchTerm.optional(),
  category: z.enum(COMMUNITY_CATEGORIES).optional(),
  access: z.enum(Object.values(COMMUNITY_ACCESS)).optional(),
  featured: booleanQuery.optional(),
  sort: z.enum(['popular', 'newest', 'active', 'name']).default('popular'),
});

const ruleSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional(),
});

// Base shape without defaults so partial updates never inject default values.
const communityFields = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(60),
  tagline: z.string().trim().max(140),
  description: z.string().trim().max(2000),
  icon: z.string().trim().min(1).max(8),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #4f46e5'),
  category: z.enum(COMMUNITY_CATEGORIES),
  tags: tagArray(8),
  accessType: z.enum(Object.values(COMMUNITY_ACCESS)),
  rules: z.array(ruleSchema).max(10),
  isFeatured: z.boolean(),
});

export const createCommunityBody = communityFields.partial().extend({
  name: communityFields.shape.name,
  category: communityFields.shape.category,
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens')
    .optional(),
});

export const updateCommunityBody = communityFields
  .partial()
  .extend({ status: z.enum(['active', 'archived']).optional() })
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');
