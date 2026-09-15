import * as projectService from '../services/projectService.js';
import { sendCreated, sendSuccess } from '../utils/response.js';

export async function list(req, res) {
  const { items, meta } = await projectService.listProjects(req.query, req.user);
  sendSuccess(res, { data: items, meta });
}

export async function detail(req, res) {
  sendSuccess(res, { data: await projectService.getProject(req.params.id, req.user) });
}

export async function create(req, res) {
  const project = await projectService.createProject(req.user, req.body);
  sendCreated(res, { data: project, message: 'Collaboration request published' });
}

export async function update(req, res) {
  const project = await projectService.updateProject(req.params.id, req.user, req.body);
  sendSuccess(res, { data: project, message: 'Project updated' });
}

export async function remove(req, res) {
  const result = await projectService.deleteProject(req.params.id, req.user);
  sendSuccess(res, { data: result, message: 'Project deleted' });
}

export async function expressInterest(req, res) {
  const interest = await projectService.expressInterest(req.params.id, req.user, req.body);
  sendCreated(res, { data: interest, message: 'Interest sent to the project author' });
}

export async function withdrawInterest(req, res) {
  sendSuccess(res, { data: await projectService.withdrawInterest(req.params.id, req.user), message: 'Interest withdrawn' });
}

export async function listInterests(req, res) {
  const { items, meta } = await projectService.listInterests(req.params.id, req.user, req.query);
  sendSuccess(res, { data: items, meta });
}

export async function updateInterest(req, res) {
  const interest = await projectService.updateInterestStatus(
    req.params.id,
    req.params.interestId,
    req.user,
    req.body,
  );
  sendSuccess(res, { data: interest, message: `Request ${interest.status}` });
}
