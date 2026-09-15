import { CONTENT_LIMITS, CONTENT_STATUS } from '../constants/content.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { can } from '../services/accessService.js';
import { toUserSummary } from './userSerializer.js';

export function toComment(comment, viewer, { canModerate = false } = {}) {
  const isPublished = comment.status === CONTENT_STATUS.PUBLISHED;
  const authorId = comment.author?._id ?? comment.author;
  const isAuthor = Boolean(viewer) && String(authorId) === viewer.id;
  const canWrite = can(viewer, PERMISSIONS.COMMENT_CREATE);

  return {
    id: String(comment._id),
    postId: String(comment.post),
    parentId: comment.parent ? String(comment.parent) : null,
    rootId: comment.root ? String(comment.root) : null,
    depth: comment.depth,
    content: isPublished ? comment.content : null,
    isDeleted: !isPublished,
    author: isPublished ? toUserSummary(comment.author) : null,
    replyCount: comment.replyCount ?? 0,
    createdAt: comment.createdAt,
    editedAt: comment.editedAt ?? null,
    permissions: {
      canEdit: isPublished && isAuthor && canWrite,
      canDelete: isPublished && (isAuthor || canModerate),
      canReply: isPublished && canWrite && comment.depth < CONTENT_LIMITS.COMMENT_MAX_DEPTH - 1,
      canReport: isPublished && Boolean(viewer) && !isAuthor,
    },
    replies: [],
  };
}
