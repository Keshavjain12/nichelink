import { ACCOUNT_STATUS } from '../constants/roles.js';
import { Community, User } from '../models/index.js';
import { COMMUNITY_SUMMARY_FIELDS, toCommunitySummary } from '../serializers/communitySerializer.js';
import { USER_SUMMARY_FIELDS, toUserSummary } from '../serializers/userSerializer.js';
import { ApiError } from '../utils/ApiError.js';
import { splitPage, toPageWindow } from '../utils/pagination.js';
import { escapeRegex, slugify } from '../utils/text.js';
import { listCommunities } from './communityService.js';
import { listPosts } from './postService.js';
import { searchProjects } from './projectService.js';

const SEARCH_ALL_PREVIEW = 5;
const SUGGESTION_LIMIT = 5;

async function searchUsers(q, { page, limit }) {
  const window = toPageWindow({ page, limit });
  const rows = await User.find(
    { $text: { $search: q }, status: ACCOUNT_STATUS.ACTIVE },
    { score: { $meta: 'textScore' } },
  )
    .select(USER_SUMMARY_FIELDS)
    .sort({ score: { $meta: 'textScore' } })
    .skip(window.skip)
    .limit(window.fetchLimit)
    .lean();
  const { items, meta } = splitPage(rows, window);
  return { items: items.map(toUserSummary), meta };
}

const SEARCHERS = Object.freeze({
  communities: (q, paging, viewer) => listCommunities({ q, ...paging }, viewer),
  users: (q, paging) => searchUsers(q, paging),
  posts: (q, paging, viewer) => listPosts({ q, ...paging }, viewer),
  projects: (q, paging, viewer) => searchProjects(q, paging, viewer),
});

const GUEST_SEARCHABLE = ['communities'];

export async function search({ q, type, page, limit }, viewer) {
  const allowed = viewer ? Object.keys(SEARCHERS) : GUEST_SEARCHABLE;
  if (type !== 'all' && !allowed.includes(type)) {
    throw ApiError.unauthorized('Sign in to search members, posts and projects');
  }

  const types = type === 'all' ? allowed : [type];
  const paging = type === 'all' ? { page: 1, limit: SEARCH_ALL_PREVIEW } : { page, limit };
  const entries = await Promise.all(
    types.map(async (searchType) => [searchType, await SEARCHERS[searchType](q, paging, viewer)]),
  );
  return Object.fromEntries(entries);
}

/** Type-ahead suggestions use anchored prefixes on lowercase indexed fields (index-friendly). */
export async function suggest(q, viewer) {
  const slugPrefix = slugify(q);
  const usernamePrefix = q.toLowerCase().replace(/[^a-z0-9_]/g, '');

  const [communities, users] = await Promise.all([
    slugPrefix
      ? Community.find({ status: 'active', slug: { $regex: `^${escapeRegex(slugPrefix)}` } })
          .select(COMMUNITY_SUMMARY_FIELDS)
          .sort({ memberCount: -1 })
          .limit(SUGGESTION_LIMIT)
          .lean()
      : [],
    viewer && usernamePrefix
      ? User.find({ status: ACCOUNT_STATUS.ACTIVE, username: { $regex: `^${escapeRegex(usernamePrefix)}` } })
          .select(USER_SUMMARY_FIELDS)
          .limit(SUGGESTION_LIMIT)
          .lean()
      : [],
  ]);

  return {
    communities: communities.map((community) => toCommunitySummary(community)),
    users: users.map(toUserSummary),
  };
}
