import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { authenticate, requirePermission } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import {
  createReportBody,
  listAdminCommunitiesQuery,
  listReportsQuery,
  listUsersQuery,
  resolveReportBody,
  userAdminBody,
  userStatusBody,
} from '../validators/adminValidators.js';
import { idParams, paginationQuery } from '../validators/common.js';

export function createAdminRouter() {
  const router = Router();
  // Every admin endpoint is guarded here, once, before any route is matched.
  router.use(authenticate, requirePermission(PERMISSIONS.ADMIN_ACCESS));

  router.get('/stats', adminController.stats);
  router.get('/users', validate({ query: listUsersQuery }), adminController.users);
  router.patch(
    '/users/:id/status',
    validate({ params: idParams, body: userStatusBody }),
    adminController.updateUserStatus,
  );
  router.patch(
    '/users/:id/admin',
    validate({ params: idParams, body: userAdminBody }),
    adminController.updateUserAdmin,
  );
  router.get(
    '/communities',
    validate({ query: listAdminCommunitiesQuery }),
    adminController.communities,
  );
  router.get('/reports', validate({ query: listReportsQuery }), adminController.reports);
  router.patch(
    '/reports/:id',
    validate({ params: idParams, body: resolveReportBody }),
    adminController.resolveReport,
  );
  router.get('/audit-logs', validate({ query: paginationQuery }), adminController.auditLogs);

  return router;
}

export function createReportRouter({ limiters }) {
  const router = Router();
  router.post(
    '/',
    authenticate,
    requirePermission(PERMISSIONS.REPORT_CREATE),
    limiters.write,
    validate({ body: createReportBody }),
    adminController.createReport,
  );
  return router;
}
