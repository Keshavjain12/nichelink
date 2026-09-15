import { CONTENT_STATUS, NOTIFICATION_TYPES, REPORT_STATUS } from '../constants/content.js';
import { AuditLog, Comment, Post, Report, User } from '../models/index.js';
import { toReport } from '../serializers/reportSerializer.js';
import { USER_SUMMARY_FIELDS } from '../serializers/userSerializer.js';
import { ApiError } from '../utils/ApiError.js';
import { buildCountedMeta } from '../utils/pagination.js';
import { setUserStatus } from './adminService.js';
import { deleteComment } from './commentService.js';
import { assertCanReadCommunity } from './communityService.js';
import { notify } from './notificationService.js';
import { deletePost } from './postService.js';

async function resolveTargetOwner(viewer, targetType, targetId) {
  if (targetType === 'Post') {
    const post = await Post.findById(targetId).select('author status communityAccess').lean();
    if (!post || post.status !== CONTENT_STATUS.PUBLISHED) throw ApiError.notFound('Post not found');
    assertCanReadCommunity(viewer, { accessType: post.communityAccess });
    return post.author;
  }
  if (targetType === 'Comment') {
    const comment = await Comment.findById(targetId).select('author status').lean();
    if (!comment || comment.status !== CONTENT_STATUS.PUBLISHED) throw ApiError.notFound('Comment not found');
    return comment.author;
  }
  const user = await User.findById(targetId).select('_id').lean();
  if (!user) throw ApiError.notFound('Member not found');
  return user._id;
}

export async function createReport(viewer, { targetType, targetId, reason, details }) {
  const targetOwner = await resolveTargetOwner(viewer, targetType, targetId);
  if (String(targetOwner) === viewer.id) throw ApiError.badRequest('You cannot report your own content');

  try {
    const report = await Report.create({ reporter: viewer.id, targetType, target: targetId, targetOwner, reason, details });
    return { id: String(report._id), status: report.status };
  } catch (error) {
    if (error?.code === 11000) throw ApiError.conflict('You have already reported this. Our moderators will review it.');
    throw error;
  }
}

async function loadTargetPreviews(reports) {
  const idsOf = (type) => reports.filter((report) => report.targetType === type).map((report) => report.target);
  const [posts, comments, users] = await Promise.all([
    Post.find({ _id: { $in: idsOf('Post') } }).select('title excerpt status community').populate('community', 'name slug').lean(),
    Comment.find({ _id: { $in: idsOf('Comment') } }).select('content status post').lean(),
    User.find({ _id: { $in: idsOf('User') } }).select(USER_SUMMARY_FIELDS).lean(),
  ]);
  return new Map([...posts, ...comments, ...users].map((doc) => [String(doc._id), doc]));
}

export async function listReports({ status, targetType, page, limit }) {
  const filter = {};
  if (status && status !== 'all') filter.status = status;
  if (targetType) filter.targetType = targetType;

  const [rows, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('reporter', USER_SUMMARY_FIELDS)
      .populate('targetOwner', USER_SUMMARY_FIELDS)
      .populate('resolution.resolvedBy', USER_SUMMARY_FIELDS)
      .lean(),
    Report.countDocuments(filter),
  ]);

  const targets = await loadTargetPreviews(rows);
  return {
    items: rows.map((report) => toReport(report, targets.get(String(report.target)))),
    meta: buildCountedMeta({ page, limit, total }),
  };
}

async function applyContentRemoval(report, admin, note) {
  const reason = note || `Removed after review (${report.reason})`;
  try {
    if (report.targetType === 'Post') await deletePost(report.target, admin, { reason });
    else if (report.targetType === 'Comment') await deleteComment(report.target, admin);
    else throw ApiError.badRequest('Use "suspend_user" for reports about members');
  } catch (error) {
    // Content that is already gone satisfies the moderation action.
    if (!(error instanceof ApiError && error.statusCode === 404)) throw error;
  }
}

const RESOLUTION_ACTIONS = Object.freeze({
  dismiss: { status: REPORT_STATUS.DISMISSED, recorded: 'none' },
  remove_content: { status: REPORT_STATUS.RESOLVED, recorded: 'content_removed' },
  suspend_user: { status: REPORT_STATUS.RESOLVED, recorded: 'user_suspended' },
});

export async function resolveReport(admin, reportId, { action, note }) {
  const report = await Report.findById(reportId).lean();
  if (!report) throw ApiError.notFound('Report not found');
  if (report.status !== REPORT_STATUS.OPEN) throw ApiError.conflict('This report has already been reviewed');

  if (action === 'remove_content') await applyContentRemoval(report, admin, note);
  if (action === 'suspend_user') {
    if (!report.targetOwner) throw ApiError.badRequest('This report has no member to suspend');
    await setUserStatus(admin, String(report.targetOwner), { status: 'suspended', reason: note || `Reported for ${report.reason}` });
  }

  const { status, recorded } = RESOLUTION_ACTIONS[action];
  const resolution = { action: recorded, note, resolvedBy: admin.id, resolvedAt: new Date() };

  // Every open report about the same target is settled by the same decision.
  const related = await Report.find({
    targetType: report.targetType,
    target: report.target,
    status: REPORT_STATUS.OPEN,
  })
    .select('reporter')
    .lean();
  await Report.updateMany({ _id: { $in: related.map((item) => item._id) } }, { $set: { status, resolution } });

  await AuditLog.create({
    actor: admin.id,
    action: `report.${action}`,
    targetType: report.targetType,
    targetId: report.target,
    metadata: { reportId: String(report._id), reports: related.length, note: note ?? null },
  });

  await Promise.all(
    related.map((item) =>
      notify({
        recipient: item.reporter,
        type: NOTIFICATION_TYPES.MODERATION,
        entityType: 'Report',
        entityId: item._id,
        title: 'Your report has been reviewed',
        body:
          status === REPORT_STATUS.DISMISSED
            ? 'Thanks for flagging this. Our moderators found no guideline violation.'
            : 'Thanks for flagging this. A moderator took action.',
      }),
    ),
  );

  return { id: String(report._id), status, resolvedCount: related.length };
}
