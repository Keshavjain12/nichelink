import { CONTENT_LIMITS, CONTENT_STATUS, NOTIFICATION_TYPES } from '../constants/content.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { AuditLog, Community, Membership, Post, Reaction, User } from '../models/index.js';
import { COMMUNITY_REF_FIELDS } from '../serializers/communitySerializer.js';
import { toPostDetail, toPostSummary } from '../serializers/postSerializer.js';
import { USER_SUMMARY_FIELDS } from '../serializers/userSerializer.js';
import { ApiError } from '../utils/ApiError.js';
import { splitPage, toPageWindow } from '../utils/pagination.js';
import { htmlToPlainText, sanitizeRichText } from '../utils/sanitizeHtml.js';
import { normalizeTags, truncate } from '../utils/text.js';
import { can, readableAccessTypes } from './accessService.js';
import {
  assertCanReadCommunity,
  canModerateCommunity,
  findCommunity,
  getMembership,
} from './communityService.js';
import { notify } from './notificationService.js';
import { assertOwnedImages, deleteImages } from './uploadService.js';

const HOUR_MS = 60 * 60 * 1000;
const TRENDING_WINDOW_MS = 14 * 24 * HOUR_MS;
const GUEST_PREVIEW_LIMIT = 5;

const POST_POPULATE = [
  { path: 'author', select: USER_SUMMARY_FIELDS },
  { path: 'community', select: COMMUNITY_REF_FIELDS },
];

async function likedPostIds(viewer, postIds) {
  if (!viewer || postIds.length === 0) return new Set();
  const reactions = await Reaction.find({ user: viewer.id, post: { $in: postIds } }).select('post').lean();
  return new Set(reactions.map((reaction) => String(reaction.post)));
}

function prepareContent(html) {
  const content = sanitizeRichText(html);
  const contentText = htmlToPlainText(content);
  if (contentText.length === 0) {
    throw ApiError.badRequest('Post content cannot be empty', {
      errors: [{ field: 'content', message: 'Write something before publishing' }],
    });
  }
  if (contentText.length > CONTENT_LIMITS.POST_CONTENT_MAX_TEXT) {
    throw ApiError.badRequest('Post content is too long', {
      errors: [{ field: 'content', message: `Keep posts under ${CONTENT_LIMITS.POST_CONTENT_MAX_TEXT} characters` }],
    });
  }
  return { content, contentText, excerpt: truncate(contentText, CONTENT_LIMITS.POST_EXCERPT_LENGTH) };
}

async function trendingPosts(filter, window) {
  const now = new Date();
  const rows = await Post.aggregate([
    { $match: { ...filter, createdAt: { $gte: new Date(now.getTime() - TRENDING_WINDOW_MS) } } },
    { $project: { content: 0 } },
    {
      $addFields: {
        // Hacker-News-style gravity: engagement decays with age.
        trendingScore: {
          $divide: [
            { $add: ['$reactionCount', { $multiply: ['$commentCount', 2] }, 1] },
            { $pow: [{ $add: [{ $divide: [{ $subtract: [now, '$createdAt'] }, HOUR_MS] }, 2] }, 1.5] },
          ],
        },
      },
    },
    { $sort: { trendingScore: -1, _id: -1 } },
    { $skip: window.skip },
    { $limit: window.fetchLimit },
  ]);
  return Post.populate(rows, POST_POPULATE);
}

export async function listPosts(params, viewer) {
  const { community: communityRef, author: username, tag, sort = 'latest', scope = 'all', q } = params;
  const isGuest = !viewer;
  const filter = { status: CONTENT_STATUS.PUBLISHED, communityAccess: { $in: readableAccessTypes(viewer) } };

  if (communityRef) {
    const community = await findCommunity(communityRef);
    assertCanReadCommunity(viewer, community);
    filter.community = community._id;
  } else if (scope === 'joined') {
    if (isGuest) throw ApiError.unauthorized('Sign in to see posts from your communities');
    filter.community = { $in: await Membership.find({ user: viewer.id, status: 'active' }).distinct('community') };
  }

  if (username) {
    if (isGuest) throw ApiError.unauthorized('Sign in to view member activity');
    const author = await User.findOne({ username }).select('_id').lean();
    if (!author) throw ApiError.notFound('Member not found');
    filter.author = author._id;
  }
  if (tag) filter.tags = tag;
  if (q) filter.$text = { $search: q };

  // Guests get a small read-only preview of public boards.
  const window = toPageWindow(
    isGuest ? { page: 1, limit: Math.min(params.limit, GUEST_PREVIEW_LIMIT) } : { page: params.page, limit: params.limit },
  );

  let rows;
  if (sort === 'trending' && !q) {
    rows = await trendingPosts(filter, window);
  } else {
    const sortSpec = q
      ? { score: { $meta: 'textScore' } }
      : sort === 'top'
        ? { reactionCount: -1, commentCount: -1, createdAt: -1 }
        : { createdAt: -1, _id: -1 };
    rows = await Post.find(filter, q ? { score: { $meta: 'textScore' }, content: 0 } : { content: 0 })
      .sort(sortSpec)
      .skip(window.skip)
      .limit(window.fetchLimit)
      .populate(POST_POPULATE)
      .lean();
  }

  const { items, meta } = splitPage(rows, window);
  const liked = await likedPostIds(
    viewer,
    items.map((post) => post._id),
  );

  return {
    items: items.map((post) => toPostSummary(post, { viewerHasLiked: liked.has(String(post._id)) })),
    meta: isGuest ? { ...meta, hasMore: false, previewOnly: true } : meta,
  };
}

export async function getPost(postId, viewer) {
  const post = await Post.findById(postId).populate(POST_POPULATE).lean();
  if (!post || post.status === CONTENT_STATUS.DELETED || !post.community) {
    throw ApiError.notFound('Post not found');
  }
  assertCanReadCommunity(viewer, post.community);

  const isAuthor = String(post.author?._id) === viewer.id;
  const canModerate = await canModerateCommunity(viewer, post.community._id);
  if (post.status === CONTENT_STATUS.REMOVED && !canModerate && !isAuthor) {
    throw ApiError.notFound('Post not found');
  }

  const isPublished = post.status === CONTENT_STATUS.PUBLISHED;
  const liked = await likedPostIds(viewer, [post._id]);

  return toPostDetail(post, {
    viewerHasLiked: liked.has(String(post._id)),
    permissions: {
      canEdit: isPublished && isAuthor && can(viewer, PERMISSIONS.POST_CREATE),
      canDelete: isPublished && (isAuthor || canModerate),
      canModerate,
      canComment: isPublished && can(viewer, PERMISSIONS.COMMENT_CREATE),
      canReact: isPublished && can(viewer, PERMISSIONS.REACTION_TOGGLE),
      canReport: isPublished && !isAuthor,
    },
  });
}

export async function createPost(viewer, { community: communityRef, title, content, tags, images }) {
  const community = await findCommunity(communityRef);
  assertCanReadCommunity(viewer, community);

  if (!can(viewer, PERMISSIONS.CONTENT_MODERATE)) {
    const membership = await getMembership(viewer.id, community._id);
    if (membership?.status !== 'active') {
      throw ApiError.forbidden('Join this community before posting', { code: ERROR_CODES.MEMBERSHIP_REQUIRED });
    }
  }

  assertOwnedImages(images, viewer.id);

  const post = await Post.create({
    author: viewer.id,
    community: community._id,
    communityAccess: community.accessType,
    title,
    ...prepareContent(content),
    images,
    tags: normalizeTags(tags),
  });

  await Community.updateOne(
    { _id: community._id },
    { $inc: { postCount: 1 }, $set: { lastActivityAt: new Date() } },
  );

  return getPost(post._id, viewer);
}

async function loadPublishedPost(postId) {
  const post = await Post.findById(postId);
  if (!post || post.status !== CONTENT_STATUS.PUBLISHED) throw ApiError.notFound('Post not found');
  return post;
}

export async function updatePost(postId, viewer, updates) {
  const post = await loadPublishedPost(postId);
  if (String(post.author) !== viewer.id) throw ApiError.forbidden('You can only edit your own posts');
  if (!can(viewer, PERMISSIONS.POST_CREATE)) {
    throw ApiError.forbidden('Upgrade to Pro to edit posts', { code: ERROR_CODES.PRO_REQUIRED });
  }

  let removedImageIds = [];
  if (updates.title !== undefined) post.title = updates.title;
  if (updates.content !== undefined) Object.assign(post, prepareContent(updates.content));
  if (updates.tags !== undefined) post.tags = normalizeTags(updates.tags);
  if (updates.images !== undefined) {
    assertOwnedImages(updates.images, viewer.id);
    const keptIds = new Set(updates.images.map((image) => image.publicId));
    removedImageIds = post.images.map((image) => image.publicId).filter((id) => !keptIds.has(id));
    post.images = updates.images;
  }

  post.editedAt = new Date();
  await post.save();
  await deleteImages(removedImageIds);
  return getPost(post._id, viewer);
}

export async function deletePost(postId, viewer, { reason } = {}) {
  const post = await loadPublishedPost(postId);
  const isAuthor = String(post.author) === viewer.id;
  const canModerate = isAuthor ? false : await canModerateCommunity(viewer, post.community);
  if (!isAuthor && !canModerate) throw ApiError.forbidden('You can only delete your own posts');

  if (isAuthor) {
    const imageIds = post.images.map((image) => image.publicId);
    post.set({ status: CONTENT_STATUS.DELETED, deletedAt: new Date(), images: [] });
    await post.save();
    await deleteImages(imageIds);
  } else {
    post.set({
      status: CONTENT_STATUS.REMOVED,
      moderation: { removedBy: viewer.id, reason: reason ?? 'Removed by a moderator', removedAt: new Date() },
    });
    await post.save();
    await AuditLog.create({
      actor: viewer.id,
      action: 'post.remove',
      targetType: 'Post',
      targetId: post._id,
      metadata: { reason: reason ?? null },
    });
    await notify({
      recipient: post.author,
      actor: viewer.id,
      type: NOTIFICATION_TYPES.MODERATION,
      entityType: 'Post',
      entityId: post._id,
      title: 'removed your post',
      body: truncate(`"${post.title}"${reason ? ` — ${reason}` : ''}`, 280),
      link: `/posts/${post._id}`,
    });
  }

  await Community.updateOne({ _id: post.community, postCount: { $gt: 0 } }, { $inc: { postCount: -1 } });
  return { id: String(post._id), status: post.status };
}

async function loadReactablePost(postId, viewer) {
  const post = await Post.findById(postId).select('author community communityAccess status title').lean();
  if (!post || post.status !== CONTENT_STATUS.PUBLISHED) throw ApiError.notFound('Post not found');
  assertCanReadCommunity(viewer, { accessType: post.communityAccess });
  return post;
}

async function reactionState(postId, liked) {
  const { reactionCount } = await Post.findById(postId).select('reactionCount').lean();
  return { liked, reactionCount };
}

export async function likePost(postId, viewer) {
  const post = await loadReactablePost(postId, viewer);
  try {
    await Reaction.create({ user: viewer.id, post: post._id });
  } catch (error) {
    if (error?.code === 11000) return reactionState(post._id, true);
    throw error;
  }

  await Post.updateOne({ _id: post._id }, { $inc: { reactionCount: 1 } });
  await notify({
    recipient: post.author,
    actor: viewer.id,
    coalesce: true,
    type: NOTIFICATION_TYPES.POST_REACTION,
    entityType: 'Post',
    entityId: post._id,
    title: 'liked your post',
    body: truncate(post.title, 140),
    link: `/posts/${post._id}`,
  });
  return reactionState(post._id, true);
}

export async function unlikePost(postId, viewer) {
  const post = await loadReactablePost(postId, viewer);
  const { deletedCount } = await Reaction.deleteOne({ user: viewer.id, post: post._id });
  if (deletedCount > 0) {
    await Post.updateOne({ _id: post._id, reactionCount: { $gt: 0 } }, { $inc: { reactionCount: -1 } });
  }
  return reactionState(post._id, false);
}
