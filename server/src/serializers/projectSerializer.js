import { PERMISSIONS } from '../constants/permissions.js';
import { can } from '../services/accessService.js';
import { toUserSummary } from './userSerializer.js';

export function toProjectSummary(project, viewer, viewerInterest) {
  const authorId = String(project.author?._id ?? project.author);
  const isAuthor = Boolean(viewer) && authorId === viewer.id;

  return {
    id: String(project._id),
    title: project.title,
    summary: project.summary ?? '',
    requiredSkills: project.requiredSkills ?? [],
    projectType: project.projectType,
    commitment: project.commitment,
    compensation: project.compensation,
    remote: project.remote,
    location: project.location ?? '',
    status: project.status,
    interestCount: project.interestCount ?? 0,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    author: toUserSummary(project.author),
    viewer: {
      isAuthor,
      interestStatus: viewerInterest?.status ?? null,
      canExpressInterest:
        Boolean(viewer) &&
        !isAuthor &&
        !viewerInterest &&
        project.status === 'open' &&
        can(viewer, PERMISSIONS.PROJECT_INTEREST),
      canEdit: isAuthor && can(viewer, PERMISSIONS.PROJECT_CREATE),
      canDelete: isAuthor || can(viewer, PERMISSIONS.CONTENT_MODERATE),
    },
  };
}

export function toProjectDetail(project, viewer, viewerInterest) {
  return { ...toProjectSummary(project, viewer, viewerInterest), description: project.description };
}

export function toInterest(interest) {
  return {
    id: String(interest._id),
    projectId: String(interest.project),
    user: toUserSummary(interest.user),
    message: interest.message ?? '',
    status: interest.status,
    createdAt: interest.createdAt,
  };
}
