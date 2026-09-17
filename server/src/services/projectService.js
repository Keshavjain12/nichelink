import { NOTIFICATION_TYPES } from '../constants/content.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { Project, ProjectInterest } from '../models/index.js';
import { toInterest, toProjectDetail, toProjectSummary } from '../serializers/projectSerializer.js';
import { USER_SUMMARY_FIELDS } from '../serializers/userSerializer.js';
import { ApiError } from '../utils/ApiError.js';
import { splitPage, toPageWindow } from '../utils/pagination.js';
import { truncate } from '../utils/text.js';
import { can } from './accessService.js';
import { notify } from './notificationService.js';

const VISIBLE_STATUSES = ['open', 'closed'];

function dedupeSkills(skills = []) {
  const seen = new Map();
  for (const skill of skills) {
    const key = skill.trim().toLowerCase();
    if (key && !seen.has(key)) seen.set(key, skill.trim());
  }
  return [...seen.values()];
}

async function viewerInterests(viewer, projectIds) {
  if (!viewer || projectIds.length === 0) return new Map();
  const interests = await ProjectInterest.find({
    user: viewer.id,
    project: { $in: projectIds },
  }).lean();
  return new Map(interests.map((interest) => [String(interest.project), interest]));
}

async function summarize(rows, viewer) {
  const interests = await viewerInterests(
    viewer,
    rows.map((project) => project._id),
  );
  return rows.map((project) =>
    toProjectSummary(project, viewer, interests.get(String(project._id))),
  );
}

export async function listProjects(
  { q, skills, projectType, commitment, compensation, remote, status, author, mine, page, limit },
  viewer,
) {
  const filter = { status: status === 'all' ? { $in: VISIBLE_STATUSES } : (status ?? 'open') };
  if (skills?.length) filter.skillKeys = { $in: skills };
  if (projectType) filter.projectType = projectType;
  if (commitment) filter.commitment = commitment;
  if (compensation) filter.compensation = compensation;
  if (remote !== undefined) filter.remote = remote;
  if (mine) filter.author = viewer.id;
  else if (author) filter.author = author;
  if (q) filter.$text = { $search: q };

  const window = toPageWindow({ page, limit });
  const rows = await Project.find(filter, q ? { score: { $meta: 'textScore' } } : {})
    .sort(q ? { score: { $meta: 'textScore' } } : { createdAt: -1, _id: -1 })
    .skip(window.skip)
    .limit(window.fetchLimit)
    .populate('author', USER_SUMMARY_FIELDS)
    .lean();

  const { items, meta } = splitPage(rows, window);
  return { items: await summarize(items, viewer), meta };
}

export function searchProjects(q, { page, limit }, viewer) {
  return listProjects({ q, page, limit, status: 'all' }, viewer);
}

async function loadProject(projectId) {
  const project = await Project.findById(projectId).populate('author', USER_SUMMARY_FIELDS);
  if (!project || !VISIBLE_STATUSES.includes(project.status))
    throw ApiError.notFound('Project not found');
  return project;
}

export async function getProject(projectId, viewer) {
  const project = (await loadProject(projectId)).toObject();
  const interest = (await viewerInterests(viewer, [project._id])).get(String(project._id));
  return toProjectDetail(project, viewer, interest);
}

export async function createProject(viewer, data) {
  const project = await Project.create({
    ...data,
    requiredSkills: dedupeSkills(data.requiredSkills),
    author: viewer.id,
  });
  return getProject(project._id, viewer);
}

function assertAuthor(project, viewer) {
  if (String(project.author._id ?? project.author) !== viewer.id) {
    throw ApiError.forbidden('Only the author can manage this project');
  }
}

export async function updateProject(projectId, viewer, updates) {
  const project = await loadProject(projectId);
  assertAuthor(project, viewer);
  if (!can(viewer, PERMISSIONS.PROJECT_CREATE)) {
    throw ApiError.forbidden('Upgrade to Pro to manage collaboration requests', {
      code: ERROR_CODES.PRO_REQUIRED,
    });
  }

  const changes = { ...updates };
  if (changes.requiredSkills) changes.requiredSkills = dedupeSkills(changes.requiredSkills);
  project.set(changes);
  await project.save();
  return getProject(project._id, viewer);
}

export async function deleteProject(projectId, viewer) {
  const project = await loadProject(projectId);
  const isAdmin = can(viewer, PERMISSIONS.CONTENT_MODERATE);
  if (!isAdmin) assertAuthor(project, viewer);

  project.set({ status: 'deleted', deletedAt: new Date() });
  await project.save();
  return { id: String(project._id), status: project.status };
}

export async function expressInterest(projectId, viewer, { message }) {
  const project = await loadProject(projectId);
  if (String(project.author._id) === viewer.id) {
    throw ApiError.badRequest('You cannot express interest in your own project');
  }
  if (project.status !== 'open')
    throw ApiError.conflict('This project is no longer accepting collaborators');

  let interest;
  try {
    interest = await ProjectInterest.create({ project: project._id, user: viewer.id, message });
  } catch (error) {
    if (error?.code === 11000)
      throw ApiError.conflict('You have already expressed interest in this project');
    throw error;
  }

  await Project.updateOne({ _id: project._id }, { $inc: { interestCount: 1 } });
  await notify({
    recipient: project.author._id,
    actor: viewer.id,
    type: NOTIFICATION_TYPES.PROJECT_INTEREST,
    entityType: 'Project',
    entityId: project._id,
    title: `is interested in "${truncate(project.title, 60)}"`,
    body: truncate(message ?? '', 200),
    link: `/projects/${project._id}`,
  });

  await interest.populate('user', USER_SUMMARY_FIELDS);
  return toInterest(interest.toObject());
}

export async function withdrawInterest(projectId, viewer) {
  const project = await loadProject(projectId);
  const { deletedCount } = await ProjectInterest.deleteOne({
    project: project._id,
    user: viewer.id,
  });
  if (deletedCount === 0)
    throw ApiError.notFound('You have not expressed interest in this project');
  await Project.updateOne(
    { _id: project._id, interestCount: { $gt: 0 } },
    { $inc: { interestCount: -1 } },
  );
  return { withdrawn: true };
}

export async function listInterests(projectId, viewer, { page, limit }) {
  const project = await loadProject(projectId);
  assertAuthor(project, viewer);

  const window = toPageWindow({ page, limit });
  const rows = await ProjectInterest.find({ project: project._id })
    .sort({ createdAt: -1 })
    .skip(window.skip)
    .limit(window.fetchLimit)
    .populate('user', USER_SUMMARY_FIELDS)
    .lean();
  const { items, meta } = splitPage(rows, window);
  return { items: items.map(toInterest), meta };
}

export async function updateInterestStatus(projectId, interestId, viewer, { status }) {
  const project = await loadProject(projectId);
  assertAuthor(project, viewer);

  const interest = await ProjectInterest.findOneAndUpdate(
    { _id: interestId, project: project._id },
    { $set: { status } },
    { returnDocument: 'after' },
  ).populate('user', USER_SUMMARY_FIELDS);
  if (!interest) throw ApiError.notFound('Interest not found');

  await notify({
    recipient: interest.user._id,
    actor: viewer.id,
    type: NOTIFICATION_TYPES.PROJECT_INTEREST_UPDATE,
    entityType: 'Project',
    entityId: project._id,
    title: `${status} your request to join "${truncate(project.title, 60)}"`,
    link: `/projects/${project._id}`,
  });

  return toInterest(interest.toObject());
}
