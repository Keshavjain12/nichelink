import { toUserSummary } from './userSerializer.js';

export const COMMUNITY_REF_FIELDS = 'name slug icon accentColor accessType';
export const COMMUNITY_SUMMARY_FIELDS =
  'name slug tagline icon accentColor category tags accessType memberCount postCount isFeatured status lastActivityAt createdAt';

export function toCommunityRef(community) {
  if (!community?.slug) return null;
  return {
    id: String(community._id),
    name: community.name,
    slug: community.slug,
    icon: community.icon,
    accentColor: community.accentColor,
    accessType: community.accessType,
  };
}

export function toCommunitySummary(community, viewer) {
  return {
    ...toCommunityRef(community),
    tagline: community.tagline ?? '',
    category: community.category,
    tags: community.tags ?? [],
    memberCount: community.memberCount ?? 0,
    postCount: community.postCount ?? 0,
    isFeatured: Boolean(community.isFeatured),
    lastActivityAt: community.lastActivityAt,
    createdAt: community.createdAt,
    ...(viewer && { viewer }),
  };
}

export function toCommunityDetail(community, { viewer, moderators = [] }) {
  return {
    ...toCommunitySummary(community, viewer),
    description: community.description ?? '',
    rules: community.rules ?? [],
    bannerUrl: community.banner?.url ?? null,
    status: community.status,
    moderators: moderators
      .map((membership) => {
        const summary = toUserSummary(membership.user);
        return summary && { ...summary, communityRole: membership.role };
      })
      .filter(Boolean),
  };
}
