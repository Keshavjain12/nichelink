import { z } from 'zod';
import {
  CONTENT_LIMITS,
  PROJECT_COMMITMENTS,
  PROJECT_COMPENSATION,
  PROJECT_TYPES,
} from '../constants/content.js';
import { booleanQuery, csvQuery, objectId, paginationQuery, searchTerm } from './common.js';

const projectFields = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(120),
  summary: z.string().trim().max(200),
  description: z
    .string()
    .trim()
    .min(30, 'Describe the project in at least 30 characters')
    .max(CONTENT_LIMITS.PROJECT_DESCRIPTION_MAX),
  requiredSkills: z
    .array(z.string().trim().min(1).max(40))
    .min(1, 'Add at least one skill')
    .max(CONTENT_LIMITS.PROJECT_MAX_SKILLS),
  projectType: z.enum(PROJECT_TYPES),
  commitment: z.enum(PROJECT_COMMITMENTS),
  compensation: z.enum(PROJECT_COMPENSATION),
  remote: z.boolean(),
  location: z.string().trim().max(80),
});

export const createProjectBody = projectFields.partial({
  summary: true,
  location: true,
  remote: true,
});

export const updateProjectBody = projectFields
  .partial()
  .extend({ status: z.enum(['open', 'closed']).optional() })
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');

export const listProjectsQuery = paginationQuery.extend({
  q: searchTerm.optional(),
  skills: csvQuery(10),
  projectType: z.enum(PROJECT_TYPES).optional(),
  commitment: z.enum(PROJECT_COMMITMENTS).optional(),
  compensation: z.enum(PROJECT_COMPENSATION).optional(),
  remote: booleanQuery.optional(),
  status: z.enum(['open', 'closed', 'all']).optional(),
  mine: booleanQuery.optional(),
  author: objectId.optional(),
});

export const interestBody = z.object({
  message: z.string().trim().max(1000).optional().default(''),
});

export const interestStatusBody = z.object({ status: z.enum(['accepted', 'declined']) });

export const interestParams = z.object({ id: objectId, interestId: objectId });
