import { truncate } from '../utils/text.js';
import { toUserSummary } from './userSerializer.js';

function toTargetPreview(targetType, target) {
  if (!target) return null;
  const id = String(target._id);

  if (targetType === 'Post') {
    return {
      id,
      title: target.title,
      excerpt: truncate(target.excerpt ?? '', 200),
      status: target.status,
      community: target.community ? { name: target.community.name, slug: target.community.slug } : null,
      link: `/posts/${id}`,
    };
  }
  if (targetType === 'Comment') {
    return {
      id,
      excerpt: truncate(target.content ?? '', 200),
      status: target.status,
      link: `/posts/${target.post}#comment-${id}`,
    };
  }
  const user = toUserSummary(target);
  return user && { ...user, link: `/profile/${user.username}` };
}

export function toReport(report, target) {
  return {
    id: String(report._id),
    targetType: report.targetType,
    targetId: String(report.target),
    target: toTargetPreview(report.targetType, target),
    targetOwner: toUserSummary(report.targetOwner),
    reporter: toUserSummary(report.reporter),
    reason: report.reason,
    details: report.details ?? '',
    status: report.status,
    resolution: report.resolution
      ? {
          action: report.resolution.action,
          note: report.resolution.note ?? null,
          resolvedBy: toUserSummary(report.resolution.resolvedBy),
          resolvedAt: report.resolution.resolvedAt,
        }
      : null,
    createdAt: report.createdAt,
  };
}
