import { CONTENT_STATUS } from '../constants/content.js';
import { toCommunityRef } from './communitySerializer.js';
import { toUserSummary } from './userSerializer.js';

const toImage = ({ url, publicId, width, height }) => ({
  url,
  publicId,
  width: width ?? null,
  height: height ?? null,
});

export function toPostSummary(post, { viewerHasLiked = false } = {}) {
  return {
    id: String(post._id),
    title: post.title,
    excerpt: post.excerpt ?? '',
    tags: post.tags ?? [],
    images: (post.images ?? []).map(toImage),
    reactionCount: post.reactionCount ?? 0,
    commentCount: post.commentCount ?? 0,
    status: post.status,
    createdAt: post.createdAt,
    editedAt: post.editedAt ?? null,
    author: toUserSummary(post.author),
    community: toCommunityRef(post.community),
    viewerHasLiked,
  };
}

export function toPostDetail(post, { viewerHasLiked, permissions }) {
  return {
    ...toPostSummary(post, { viewerHasLiked }),
    content: post.status === CONTENT_STATUS.PUBLISHED ? post.content : '',
    moderation:
      post.status === CONTENT_STATUS.REMOVED ? { reason: post.moderation?.reason ?? null } : null,
    permissions,
  };
}
