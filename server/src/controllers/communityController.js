import * as communityService from '../services/communityService.js';
import * as postService from '../services/postService.js';
import { sendCreated, sendSuccess } from '../utils/response.js';

export async function list(req, res) {
  const { items, meta } = await communityService.listCommunities(req.query, req.user);
  sendSuccess(res, { data: items, meta });
}

export async function trending(req, res) {
  sendSuccess(res, { data: await communityService.trendingCommunities(req.user) });
}

export async function recommended(req, res) {
  sendSuccess(res, { data: await communityService.recommendedCommunities(req.user) });
}

export async function mine(req, res) {
  sendSuccess(res, { data: await communityService.listViewerCommunities(req.user) });
}

export async function detail(req, res) {
  sendSuccess(res, { data: await communityService.getCommunityDetail(req.params.community, req.user) });
}

export async function create(req, res) {
  const community = await communityService.createCommunity(req.body, req.user);
  sendCreated(res, { data: community, message: 'Community created' });
}

export async function update(req, res) {
  const community = await communityService.updateCommunity(req.params.community, req.body, req.user);
  sendSuccess(res, { data: community, message: 'Community updated' });
}

export async function join(req, res) {
  const { created, community } = await communityService.joinCommunity(req.params.community, req.user);
  sendSuccess(res, {
    status: created ? 201 : 200,
    data: community,
    message: created ? `Welcome to ${community.name}` : 'You are already a member',
  });
}

export async function leave(req, res) {
  const community = await communityService.leaveCommunity(req.params.community, req.user);
  sendSuccess(res, { data: community, message: `You left ${community.name}` });
}

export async function members(req, res) {
  const { items, meta } = await communityService.listMembers(req.params.community, req.user, req.query);
  sendSuccess(res, { data: items, meta });
}

export async function posts(req, res) {
  const { items, meta } = await postService.listPosts(
    { ...req.query, community: req.params.community },
    req.user,
  );
  sendSuccess(res, { data: items, meta });
}
