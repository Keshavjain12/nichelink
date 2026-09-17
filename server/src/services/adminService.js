import { logger } from '../config/logger.js';
import { CONTENT_STATUS, NOTIFICATION_TYPES, REPORT_STATUS } from '../constants/content.js';
import { ACCOUNT_STATUS, ROLES } from '../constants/roles.js';
import {
  AuditLog,
  Comment,
  Community,
  Conversation,
  Message,
  Post,
  Project,
  Report,
  User,
} from '../models/index.js';
import {
  COMMUNITY_SUMMARY_FIELDS,
  toCommunitySummary,
} from '../serializers/communitySerializer.js';
import { USER_SUMMARY_FIELDS, toAdminUser, toUserSummary } from '../serializers/userSerializer.js';
import { disconnectUser } from '../sockets/realtime.js';
import { ApiError } from '../utils/ApiError.js';
import { buildCountedMeta } from '../utils/pagination.js';
import { escapeRegex } from '../utils/text.js';
import { revokeAllSessions } from './authService.js';
import { notify } from './notificationService.js';
import { refreshUserEntitlement } from './subscriptionService.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(timestamp) {
  const date = new Date(timestamp);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/** Zero-filled per-day counts so charts render continuous series. */
async function dailySeries(Model, match, days) {
  const since = startOfUtcDay(Date.now() - (days - 1) * DAY_MS);
  const rows = await Model.aggregate([
    { $match: { ...match, createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
  ]);
  const counts = new Map(rows.map((row) => [row._id, row.count]));
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(since.getTime() + index * DAY_MS).toISOString().slice(0, 10);
    return { date, count: counts.get(date) ?? 0 };
  });
}

export async function getDashboardStats() {
  const weekAgo = new Date(Date.now() - 7 * DAY_MS);

  const [
    totalUsers,
    proUsers,
    adminUsers,
    suspendedUsers,
    newUsersThisWeek,
    communities,
    proCommunities,
    posts,
    comments,
    conversations,
    messagesThisWeek,
    openProjects,
    openReports,
    signups,
    postsPerDay,
    messagesPerDay,
    recentUsers,
    recentCommunities,
    topCommunities,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: ROLES.PRO }),
    User.countDocuments({ role: ROLES.ADMIN }),
    User.countDocuments({ status: ACCOUNT_STATUS.SUSPENDED }),
    User.countDocuments({ createdAt: { $gte: weekAgo } }),
    Community.countDocuments({ status: 'active' }),
    Community.countDocuments({ status: 'active', accessType: 'pro' }),
    Post.countDocuments({ status: CONTENT_STATUS.PUBLISHED }),
    Comment.countDocuments({ status: CONTENT_STATUS.PUBLISHED }),
    Conversation.countDocuments({ 'lastMessage.body': { $exists: true } }),
    Message.countDocuments({ createdAt: { $gte: weekAgo } }),
    Project.countDocuments({ status: 'open' }),
    Report.countDocuments({ status: REPORT_STATUS.OPEN }),
    dailySeries(User, {}, 30),
    dailySeries(Post, { status: CONTENT_STATUS.PUBLISHED }, 30),
    dailySeries(Message, {}, 14),
    User.find().sort({ createdAt: -1 }).limit(6).lean(),
    Community.find().select(COMMUNITY_SUMMARY_FIELDS).sort({ createdAt: -1 }).limit(5).lean(),
    Community.find({ status: 'active' })
      .select(COMMUNITY_SUMMARY_FIELDS)
      .sort({ memberCount: -1 })
      .limit(5)
      .lean(),
  ]);

  return {
    totals: {
      users: totalUsers,
      proUsers,
      freeUsers: totalUsers - proUsers - adminUsers,
      adminUsers,
      suspendedUsers,
      newUsersThisWeek,
      communities,
      proCommunities,
      posts,
      comments,
      conversations,
      messagesThisWeek,
      openProjects,
      openReports,
    },
    series: { signups, posts: postsPerDay, messages: messagesPerDay },
    recentUsers: recentUsers.map(toAdminUser),
    recentCommunities: recentCommunities.map((community) => ({
      ...toCommunitySummary(community),
      status: community.status,
    })),
    topCommunities: topCommunities.map((community) => toCommunitySummary(community)),
  };
}

export async function listUsers({ q, role, status, page, limit }) {
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (q) {
    // Anchored prefixes on unique, indexed fields keep admin lookups index-backed.
    const prefix = new RegExp(`^${escapeRegex(q.toLowerCase())}`);
    filter.$or = [{ username: prefix }, { email: prefix }];
  }

  const [rows, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);
  return { items: rows.map(toAdminUser), meta: buildCountedMeta({ page, limit, total }) };
}

async function loadManagedUser(admin, userId) {
  if (userId === admin.id)
    throw ApiError.badRequest('You cannot change your own account from the admin panel');
  const user = await User.findById(userId).lean();
  if (!user) throw ApiError.notFound('Member not found');
  return user;
}

export async function setUserStatus(admin, userId, { status, reason }) {
  const user = await loadManagedUser(admin, userId);
  if (user.role === ROLES.ADMIN && status === ACCOUNT_STATUS.SUSPENDED) {
    throw ApiError.forbidden('Demote this admin before suspending the account');
  }

  const update =
    status === ACCOUNT_STATUS.SUSPENDED
      ? {
          $set: {
            status,
            suspendedAt: new Date(),
            suspensionReason: reason ?? 'Violation of community guidelines',
          },
        }
      : { $set: { status }, $unset: { suspendedAt: 1, suspensionReason: 1 } };
  await User.updateOne({ _id: user._id }, update);

  if (status === ACCOUNT_STATUS.SUSPENDED) {
    await revokeAllSessions(user._id, 'suspended');
    disconnectUser(user._id);
  } else {
    await notify({
      recipient: user._id,
      type: NOTIFICATION_TYPES.ACCOUNT,
      title: 'Your account has been reinstated',
      body: 'Welcome back. Please review the community guidelines.',
    });
  }

  await AuditLog.create({
    actor: admin.id,
    action: status === ACCOUNT_STATUS.SUSPENDED ? 'user.suspend' : 'user.activate',
    targetType: 'User',
    targetId: user._id,
    metadata: { reason: reason ?? null },
  });
  logger.info(
    { adminId: admin.id, userId: String(user._id), status },
    'Admin changed account status',
  );

  return toAdminUser(await User.findById(user._id).lean());
}

export async function setUserAdmin(admin, userId, { isAdmin }) {
  const user = await loadManagedUser(admin, userId);
  if (user.status === ACCOUNT_STATUS.SUSPENDED && isAdmin) {
    throw ApiError.badRequest('Reactivate the account before granting admin access');
  }

  if (isAdmin) {
    await User.updateOne({ _id: user._id }, { $set: { role: ROLES.ADMIN } });
  } else {
    // Demotion hands role assignment back to the subscription state.
    await User.updateOne({ _id: user._id }, { $set: { role: ROLES.FREE } });
    await refreshUserEntitlement(user._id);
  }

  await AuditLog.create({
    actor: admin.id,
    action: isAdmin ? 'user.grant_admin' : 'user.revoke_admin',
    targetType: 'User',
    targetId: user._id,
  });
  logger.info(
    { adminId: admin.id, userId: String(user._id), isAdmin },
    'Admin changed admin access',
  );

  return toAdminUser(await User.findById(user._id).lean());
}

export async function listCommunitiesForAdmin({ q, status, page, limit }) {
  const filter = {};
  if (status && status !== 'all') filter.status = status;
  if (q) filter.$text = { $search: q };

  const [rows, total] = await Promise.all([
    Community.find(filter)
      .select(`${COMMUNITY_SUMMARY_FIELDS} createdBy`)
      .populate('createdBy', USER_SUMMARY_FIELDS)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Community.countDocuments(filter),
  ]);

  return {
    items: rows.map((community) => ({
      ...toCommunitySummary(community),
      status: community.status,
      createdBy: toUserSummary(community.createdBy),
    })),
    meta: buildCountedMeta({ page, limit, total }),
  };
}

export async function listAuditLogs({ page, limit }) {
  const [rows, total] = await Promise.all([
    AuditLog.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('actor', USER_SUMMARY_FIELDS)
      .lean(),
    AuditLog.countDocuments(),
  ]);

  return {
    items: rows.map((entry) => ({
      id: String(entry._id),
      action: entry.action,
      targetType: entry.targetType,
      targetId: String(entry.targetId),
      metadata: entry.metadata ?? {},
      actor: toUserSummary(entry.actor),
      createdAt: entry.createdAt,
    })),
    meta: buildCountedMeta({ page, limit, total }),
  };
}
