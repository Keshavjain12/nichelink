import { z } from 'zod';
import {
  CONTENT_LIMITS,
  REPORT_REASONS,
  REPORT_STATUS,
  REPORT_TARGET_TYPES,
} from '../constants/content.js';
import { ACCOUNT_STATUS, PERSISTED_ROLES } from '../constants/roles.js';
import { objectId, paginationQuery, searchTerm } from './common.js';

export const createReportBody = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: objectId,
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(CONTENT_LIMITS.REPORT_DETAILS_MAX).optional().default(''),
});

export const listReportsQuery = paginationQuery.extend({
  status: z.enum([...Object.values(REPORT_STATUS), 'all']).default(REPORT_STATUS.OPEN),
  targetType: z.enum(REPORT_TARGET_TYPES).optional(),
});

export const resolveReportBody = z.object({
  action: z.enum(['dismiss', 'remove_content', 'suspend_user']),
  note: z.string().trim().max(500).optional(),
});

export const listUsersQuery = paginationQuery.extend({
  q: searchTerm.optional(),
  role: z.enum(PERSISTED_ROLES).optional(),
  status: z.enum(Object.values(ACCOUNT_STATUS)).optional(),
});

export const userStatusBody = z.object({
  status: z.enum(Object.values(ACCOUNT_STATUS)),
  reason: z.string().trim().max(500).optional(),
});

export const userAdminBody = z.object({ isAdmin: z.boolean() });

export const listAdminCommunitiesQuery = paginationQuery.extend({
  q: searchTerm.optional(),
  status: z.enum(['active', 'archived', 'all']).default('all'),
});
