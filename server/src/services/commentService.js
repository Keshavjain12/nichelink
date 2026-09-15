import { CONTENT_LIMITS, CONTENT_STATUS, NOTIFICATION_TYPES } from '../constants/content.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { Comment, Community, Post } from '../models/index.js';
import { toComment } from '../serializers/commentSerializer.js';
import { USER_SUMMARY_FIELDS } from '../serializers/userSerializer.js';
import { ApiError } from '../utils/ApiError.js';
import { splitPage, toPageWindow } from '../utils/pagination.js';
import { truncate } from '../utils/text.js';
import { can } from './accessService.js';
import { assertCanReadCommunity, canModerateCommunity } from './communityService.js';
import { notify } from './notificationService.js';

/** Upper bound on replies loaded for one page of threads. */
const MAX_DESCENDANTS_PER_PAGE = 500;

async function loadReadablePost(postId, viewer) {
  const post = await Post.findById(postId).select('author community communityAccess status title commentCount').lean();
  if (!post || post.status !== CONTENT_STATUS.PUBLISHED) throw ApiError.notFound('Post not found');
  assertCanReadCommunity(viewer, { accessType: post.communityAccess });
  return post;
}

/** Deleted comments stay as placeholders only while they still have visible replies. */
function pruneDeletedLeaves(nodes) {
  return nodes
    .map((node) => ({ ...node, replies: pruneDeletedLeaves(node.replies) }))
    .filter((node) => !node.isDeleted || node.replies.length > 0);
}

export async function listComments(postId, viewer, { page, limit, sort = 'oldest' }) {
  const post = await loadReadablePost(postId, viewer);
  const window = toPageWindow({ page, limit });

  const roots = await Comment.find({ post: post._id, parent: null })
    .sort({ createdAt: sort === 'newest' ? -1 : 1 })
    .skip(window.skip)
    .limit(window.fetchLimit)
    .populate('author', USER_SUMMARY_FIELDS)
    .lean();
  const { items: rootPage, meta } = splitPage(roots, window);

  const [descendants, canModerate] = await Promise.all([
    rootPage.length
      ? Comment.find({ root: { $in: rootPage.map((root) => root._id) } })
          .sort({ createdAt: 1 })
          .limit(MAX_DESCENDANTS_PER_PAGE)
          .populate('author', USER_SUMMARY_FIELDS)
          .lean()
      : [],
    canModerateCommunity(viewer, post.community),
  ]);

  const nodes = new Map();
  const tree = rootPage.map((root) => {
    const node = toComment(root, viewer, { canModerate });
    nodes.set(node.id, node);
    return node;
  });
  for (const comment of descendants) {
    const node = toComment(comment, viewer, { canModerate });
    nodes.set(node.id, node);
    (nodes.get(node.parentId) ?? nodes.get(node.rootId))?.replies.push(node);
  }

  return { items: pruneDeletedLeaves(tree), meta: { ...meta, total: post.commentCount } };
}

export async function createComment(postId, viewer, { content, parentId }) {
  const post = await loadReadablePost(postId, viewer);

  let parent = null;
  if (parentId) {
    parent = await Comment.findOne({ _id: parentId, post: post._id }).lean();
    if (!parent) throw ApiError.notFound('The comment you are replying to no longer exists');
    if (parent.status !== CONTENT_STATUS.PUBLISHED) throw ApiError.badRequest('You cannot reply to a deleted comment');
    if (parent.depth >= CONTENT_LIMITS.COMMENT_MAX_DEPTH - 1) {
      throw ApiError.badRequest('This thread has reached its maximum reply depth');
    }
  }

  const comment = await Comment.create({
    post: post._id,
    author: viewer.id,
    parent: parent?._id ?? null,
    root: parent ? (parent.root ?? parent._id) : null,
    depth: parent ? parent.depth + 1 : 0,
    content,
  });

  await Promise.all([
    Post.updateOne({ _id: post._id }, { $inc: { commentCount: 1 } }),
    parent && Comment.updateOne({ _id: parent._id }, { $inc: { replyCount: 1 } }),
    Community.updateOne({ _id: post.community }, { $set: { lastActivityAt: new Date() } }),
  ]);

  const snippet = truncate(content, 140);
  const link = `/posts/${post._id}#comment-${comment._id}`;
  if (parent) {
    await notify({
      recipient: parent.author,
      actor: viewer.id,
      type: NOTIFICATION_TYPES.COMMENT_REPLY,
      entityType: 'Comment',
      entityId: comment._id,
      title: 'replied to your comment',
      body: snippet,
      link,
    });
  }
  if (!parent || String(parent.author) !== String(post.author)) {
    await notify({
      recipient: post.author,
      actor: viewer.id,
      type: NOTIFICATION_TYPES.POST_COMMENT,
      entityType: 'Comment',
      entityId: comment._id,
      title: `commented on "${truncate(post.title, 60)}"`,
      body: snippet,
      link,
    });
  }

  await comment.populate('author', USER_SUMMARY_FIELDS);
  return toComment(comment.toObject(), viewer, { canModerate: await canModerateCommunity(viewer, post.community) });
}

async function loadPublishedComment(commentId) {
  const comment = await Comment.findById(commentId);
  if (!comment || comment.status !== CONTENT_STATUS.PUBLISHED) throw ApiError.notFound('Comment not found');
  return comment;
}

export async function updateComment(commentId, viewer, { content }) {
  const comment = await loadPublishedComment(commentId);
  if (String(comment.author) !== viewer.id) throw ApiError.forbidden('You can only edit your own comments');
  if (!can(viewer, PERMISSIONS.COMMENT_CREATE)) {
    throw ApiError.forbidden('Upgrade to Pro to edit comments', { code: ERROR_CODES.PRO_REQUIRED });
  }

  comment.set({ content, editedAt: new Date() });
  await comment.save();
  await comment.populate('author', USER_SUMMARY_FIELDS);
  return toComment(comment.toObject(), viewer);
}

export async function deleteComment(commentId, viewer) {
  const comment = await loadPublishedComment(commentId);
  const post = await Post.findById(comment.post).select('community').lean();
  const isAuthor = String(comment.author) === viewer.id;
  const canModerate = !isAuthor && post ? await canModerateCommunity(viewer, post.community) : false;
  if (!isAuthor && !canModerate) throw ApiError.forbidden('You can only delete your own comments');

  comment.set({ status: isAuthor ? CONTENT_STATUS.DELETED : CONTENT_STATUS.REMOVED, deletedAt: new Date() });
  await comment.save();

  await Promise.all([
    Post.updateOne({ _id: comment.post, commentCount: { $gt: 0 } }, { $inc: { commentCount: -1 } }),
    comment.parent &&
      Comment.updateOne({ _id: comment.parent, replyCount: { $gt: 0 } }, { $inc: { replyCount: -1 } }),
  ]);

  return { id: String(comment._id), status: comment.status };
}
