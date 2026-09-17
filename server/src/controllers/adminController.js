import * as adminService from '../services/adminService.js';
import * as reportService from '../services/reportService.js';
import { sendCreated, sendSuccess } from '../utils/response.js';

export async function stats(_req, res) {
  sendSuccess(res, { data: await adminService.getDashboardStats() });
}

export async function users(req, res) {
  const { items, meta } = await adminService.listUsers(req.query);
  sendSuccess(res, { data: items, meta });
}

export async function updateUserStatus(req, res) {
  const user = await adminService.setUserStatus(req.user, req.params.id, req.body);
  sendSuccess(res, {
    data: user,
    message: user.status === 'suspended' ? 'Account suspended' : 'Account reactivated',
  });
}

export async function updateUserAdmin(req, res) {
  const user = await adminService.setUserAdmin(req.user, req.params.id, req.body);
  sendSuccess(res, {
    data: user,
    message: req.body.isAdmin ? 'Admin access granted' : 'Admin access revoked',
  });
}

export async function communities(req, res) {
  const { items, meta } = await adminService.listCommunitiesForAdmin(req.query);
  sendSuccess(res, { data: items, meta });
}

export async function reports(req, res) {
  const { items, meta } = await reportService.listReports(req.query);
  sendSuccess(res, { data: items, meta });
}

export async function resolveReport(req, res) {
  const result = await reportService.resolveReport(req.user, req.params.id, req.body);
  sendSuccess(res, { data: result, message: 'Report reviewed' });
}

export async function auditLogs(req, res) {
  const { items, meta } = await adminService.listAuditLogs(req.query);
  sendSuccess(res, { data: items, meta });
}

export async function createReport(req, res) {
  const report = await reportService.createReport(req.user, req.body);
  sendCreated(res, { data: report, message: 'Thanks — our moderators will review this report' });
}
