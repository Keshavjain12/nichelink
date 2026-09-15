import { ERROR_CODES } from '../constants/errorCodes.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { COMMUNITY_ACCESS, COMMUNITY_ROLES } from '../constants/roles.js';
import { AuditLog, Community, Membership, Post, User } from '../models/index.js';
import {
  COMMUNITY_SUMMARY_FIELDS,
  toCommunityDetail,
  toCommunitySummary,
} from '../serializers/communitySerializer.js';
import { USER_SUMMARY_FIELDS, toUserSummary } from '../serializers/userSerializer.js';
import { ApiError } from '../utils/ApiError.js';
import { buildCountedMeta, splitPage, toPageWindow } from '../utils/pagination.js';
import { normalizeTags, slugify } from '../utils/text.js';
import { can, canAccessCommunityContent } from './accessService.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MODERATOR_ROLES = [COMMUNITY_ROLES.MODERATOR, COMMUNITY_ROLES.OWNER];
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;
const SIDEBAR_LIMIT = 5;

const LIST_SORTS = Object.freeze({
  popular: { memberCount: -1, _id: 1 },
  newest: { createdAt: -1, _id: -1 },
  active: { lastActivityAt: -1, _id: -1 },
  name: { name: 1, _id: 1 },
});

export async function findCommunity(idOrSlug, { includeArchived = false } = {}) {
  const filter = OBJECT_ID_PATTERN.test(idOrSlug) ? { _id: idOrSlug } : { slug: String(idOrSlug).toLowerCase() };
  if (!includeArchived) filter.status = 'active';
  const community = await Community.findOne(filter).lean();
  if (!community) throw ApiError.notFound('Community not found');
  return community;
}

export function getMembership(userId, communityId) {
  if (!userId) return null;
  return Membership.findOne({ user: userId, community: communityId }).lean();
}

export async function canModerateCommunity(viewer, communityId) {
  if (!viewer) return false;
  if (can(viewer, PERMISSIONS.CONTENT_MODERATE)) return true;
  const membership = await getMembership(viewer.id, communityId);
  return membership?.status === 'active' && MODERATOR_ROLES.includes(membership.role);
}

export function assertCanReadCommunity(viewer, community) {
  if (canAccessCommunityContent(viewer, community)) return;
  if (!viewer) throw ApiError.unauthorized('Sign in with a Pro account to read this community');
  throw ApiError.forbidden('This is a Pro community. Upgrade to Pro to read its discussions.', {
    code: ERROR_CODES.PRO_REQUIRED,
  });
}

function buildViewerState(viewer, community, membership) {
  const isMember = membership?.status === 'active';
  const isAdmin = can(viewer, PERMISSIONS.CONTENT_MODERATE);
  const canRead = canAccessCommunityContent(viewer, community);
  const joinPermission =
    community.accessType === COMMUNITY_ACCESS.PRO ? PERMISSIONS.COMMUNITY_JOIN_PRO : PERMISSIONS.COMMUNITY_JOIN;

  return {
    isAuthenticated: Boolean(viewer),
    isMember,
    role: isMember ? membership.role : null,
    isBanned: membership?.status === 'banned',
    canRead,
    canJoin: Boolean(viewer) && !membership && can(viewer, joinPermission),
    requiresPro: !canRead,
    canPost: canRead && can(viewer, PERMISSIONS.POST_CREATE) && (isMember || isAdmin),
    canModerate: isAdmin || (isMember && MODERATOR_ROLES.includes(membership.role)),
  };
}

async function viewerMemberships(viewer, communityIds) {
  if (!viewer || communityIds.length === 0) return new Map();
  const memberships = await Membership.find({ user: viewer.id, community: { $in: communityIds } }).lean();
  return new Map(memberships.map((membership) => [String(membership.community), membership]));
}

async function summarizeForViewer(communities, viewer) {
  const memberships = await viewerMemberships(
    viewer,
    communities.map((community) => community._id),
  );
  return communities.map((community) =>
    toCommunitySummary(community, buildViewerState(viewer, community, memberships.get(String(community._id)))),
  );
}

export async function listCommunities({ q, category, access, featured, sort = 'popular', page, limit }, viewer) {
  const filter = { status: 'active' };
  if (category) filter.category = category;
  if (access) filter.accessType = access;
  if (featured) filter.isFeatured = true;
  if (q) filter.$text = { $search: q };

  const projection = q ? { score: { $meta: 'textScore' } } : {};
  const sortSpec = q ? { score: { $meta: 'textScore' }, memberCount: -1 } : LIST_SORTS[sort];

  const [rows, total] = await Promise.all([
    Community.find(filter, projection)
      .select(COMMUNITY_SUMMARY_FIELDS)
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Community.countDocuments(filter),
  ]);

  return { items: await summarizeForViewer(rows, viewer), meta: buildCountedMeta({ page, limit, total }) };
}

export async function getCommunityDetail(idOrSlug, viewer) {
  const community = await findCommunity(idOrSlug);
  const [membership, moderators] = await Promise.all([
    getMembership(viewer?.id, community._id),
    Membership.find({ community: community._id, status: 'active', role: { $in: MODERATOR_ROLES } })
      .sort({ role: -1, joinedAt: 1 })
      .limit(12)
      .populate('user', USER_SUMMARY_FIELDS)
      .lean(),
  ]);

  return toCommunityDetail(community, {
    viewer: buildViewerState(viewer, community, membership),
    moderators,
  });
}

export async function createCommunity(data, actor) {
  const slug = data.slug ?? slugify(data.name);
  if (!slug || slug.length < 3) {
    throw ApiError.badRequest('Choose a name that produces a valid URL slug', {
      errors: [{ field: 'slug', message: 'Slug must be at least 3 characters' }],
    });
  }
  if (await Community.exists({ slug })) {
    throw ApiError.conflict('A community with this URL already exists', {
      errors: [{ field: 'slug', message: 'Slug is already in use' }],
    });
  }

  const community = await Community.create({
    ...data,
    slug,
    tags: normalizeTags(data.tags),
    createdBy: actor.id,
    memberCount: 1,
  });

  try {
    await Membership.create({ user: actor.id, community: community._id, role: COMMUNITY_ROLES.OWNER });
  } catch (error) {
    await Community.deleteOne({ _id: community._id });
    throw error;
  }

  await AuditLog.create({ actor: actor.id, action: 'community.create', targetType: 'Community', targetId: community._id });
  return getCommunityDetail(community.slug, actor);
}

export async function updateCommunity(idOrSlug, updates, actor) {
  const community = await findCommunity(idOrSlug, { includeArchived: true });
  const changes = { ...updates };
  if (changes.tags) changes.tags = normalizeTags(changes.tags);

  await Community.updateOne({ _id: community._id }, { $set: changes }, { runValidators: true });

  if (changes.accessType && changes.accessType !== community.accessType) {
    await Post.updateMany({ community: community._id }, { $set: { communityAccess: changes.accessType } });
  }

  await AuditLog.create({
    actor: actor.id,
    action: 'community.update',
    targetType: 'Community',
    targetId: community._id,
    metadata: { fields: Object.keys(changes) },
  });

  const updated = await Community.findById(community._id).lean();
  const membership = await getMembership(actor.id, community._id);
  return toCommunityDetail(updated, { viewer: buildViewerState(actor, updated, membership) });
}

export async function joinCommunity(idOrSlug, viewer) {
  const community = await findCommunity(idOrSlug);

  if (community.accessType === COMMUNITY_ACCESS.PRO && !can(viewer, PERMISSIONS.COMMUNITY_JOIN_PRO)) {
    throw ApiError.forbidden('Pro communities are available to Pro members', { code: ERROR_CODES.PRO_REQUIRED });
  }

  const existing = await getMembership(viewer.id, community._id);
  if (existing?.status === 'banned') throw ApiError.forbidden('You cannot join this community');

  let created = false;
  if (!existing) {
    try {
      await Membership.create({ user: viewer.id, community: community._id });
      await Community.updateOne({ _id: community._id }, { $inc: { memberCount: 1 } });
      created = true;
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }

  return { created, community: await getCommunityDetail(community.slug, viewer) };
}

export async function leaveCommunity(idOrSlug, viewer) {
  const community = await findCommunity(idOrSlug);
  const membership = await getMembership(viewer.id, community._id);
  if (!membership) throw ApiError.notFound('You are not a member of this community');
  if (membership.role === COMMUNITY_ROLES.OWNER) {
    throw ApiError.conflict('Owners cannot leave their community. Transfer ownership first.');
  }

  const { deletedCount } = await Membership.deleteOne({ _id: membership._id });
  if (deletedCount > 0) {
    await Community.updateOne({ _id: community._id, memberCount: { $gt: 0 } }, { $inc: { memberCount: -1 } });
  }
  return getCommunityDetail(community.slug, viewer);
}

export async function listMembers(idOrSlug, viewer, { page, limit }) {
  const community = await findCommunity(idOrSlug);
  const window = toPageWindow({ page, limit });
  const rows = await Membership.find({ community: community._id, status: 'active' })
    .sort({ joinedAt: -1 })
    .skip(window.skip)
    .limit(window.fetchLimit)
    .populate('user', USER_SUMMARY_FIELDS)
    .lean();

  const { items, meta } = splitPage(rows, window);
  return {
    items: items
      .map((membership) => {
        const user = toUserSummary(membership.user);
        return user && { ...user, communityRole: membership.role, joinedAt: membership.joinedAt };
      })
      .filter(Boolean),
    meta,
  };
}

export async function listViewerCommunities(viewer) {
  const memberships = await Membership.find({ user: viewer.id, status: 'active' })
    .sort({ joinedAt: -1 })
    .limit(100)
    .populate({ path: 'community', select: COMMUNITY_SUMMARY_FIELDS, match: { status: 'active' } })
    .lean();

  return memberships
    .filter((membership) => membership.community)
    .map((membership) =>
      toCommunitySummary(membership.community, buildViewerState(viewer, membership.community, membership)),
    );
}

export async function listUserCommunities(userId, viewer) {
  const memberships = await Membership.find({ user: userId, status: 'active' })
    .sort({ joinedAt: -1 })
    .limit(50)
    .populate({ path: 'community', select: COMMUNITY_SUMMARY_FIELDS, match: { status: 'active' } })
    .lean();
  return summarizeForViewer(
    memberships.map((membership) => membership.community).filter(Boolean),
    viewer,
  );
}

async function fillWithPopular(communities, { excludeIds, limit }) {
  if (communities.length >= limit) return communities.slice(0, limit);
  const exclude = [...excludeIds, ...communities.map((community) => community._id)];
  const extra = await Community.find({ status: 'active', _id: { $nin: exclude } })
    .select(COMMUNITY_SUMMARY_FIELDS)
    .sort(LIST_SORTS.popular)
    .limit(limit - communities.length)
    .lean();
  return [...communities, ...extra];
}

export async function trendingCommunities(viewer, limit = SIDEBAR_LIMIT) {
  const since = new Date(Date.now() - 7 * DAY_MS);
  const activity = await Post.aggregate([
    { $match: { status: 'published', createdAt: { $gte: since } } },
    {
      $group: {
        _id: '$community',
        recentPosts: { $sum: 1 },
        engagement: { $sum: { $add: ['$reactionCount', '$commentCount'] } },
      },
    },
    { $sort: { recentPosts: -1, engagement: -1 } },
    { $limit: limit * 2 },
  ]);

  const activityById = new Map(activity.map((entry) => [String(entry._id), entry]));
  const active = await Community.find({ _id: { $in: [...activityById.keys()] }, status: 'active' })
    .select(COMMUNITY_SUMMARY_FIELDS)
    .lean();
  active.sort(
    (a, b) =>
      activityById.get(String(b._id)).recentPosts - activityById.get(String(a._id)).recentPosts ||
      activityById.get(String(b._id)).engagement - activityById.get(String(a._id)).engagement,
  );

  const communities = await fillWithPopular(active, { excludeIds: [], limit });
  const summaries = await summarizeForViewer(communities, viewer);
  return summaries.map((summary) => ({
    ...summary,
    recentPostCount: activityById.get(summary.id)?.recentPosts ?? 0,
  }));
}

export async function recommendedCommunities(viewer, limit = SIDEBAR_LIMIT) {
  const [user, joinedIds] = await Promise.all([
    User.findById(viewer.id).select('skills interests').lean(),
    Membership.find({ user: viewer.id }).distinct('community'),
  ]);

  const topics = normalizeTags([...(user?.skills ?? []), ...(user?.interests ?? [])]);
  const matches = topics.length
    ? await Community.find({ status: 'active', _id: { $nin: joinedIds }, tags: { $in: topics } })
        .select(COMMUNITY_SUMMARY_FIELDS)
        .sort(LIST_SORTS.popular)
        .limit(limit)
        .lean()
    : [];

  const communities = await fillWithPopular(matches, { excludeIds: joinedIds, limit });
  return summarizeForViewer(communities, viewer);
}
