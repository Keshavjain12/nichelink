import { Router } from 'express';
import * as communityController from '../controllers/communityController.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  authenticate,
  optionalAuthenticate,
  requirePermission,
} from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import {
  communityParams,
  createCommunityBody,
  listCommunitiesQuery,
  updateCommunityBody,
} from '../validators/communityValidators.js';
import { paginationQuery } from '../validators/common.js';
import { listPostsQuery } from '../validators/postValidators.js';

export function createCommunityRouter({ limiters }) {
  const router = Router();

  router.get(
    '/',
    optionalAuthenticate,
    validate({ query: listCommunitiesQuery }),
    communityController.list,
  );
  router.get('/trending', optionalAuthenticate, communityController.trending);
  router.get('/recommended', authenticate, communityController.recommended);
  router.post(
    '/',
    authenticate,
    requirePermission(PERMISSIONS.COMMUNITY_MANAGE),
    limiters.write,
    validate({ body: createCommunityBody }),
    communityController.create,
  );

  router.get(
    '/:community',
    optionalAuthenticate,
    validate({ params: communityParams }),
    communityController.detail,
  );
  router.patch(
    '/:community',
    authenticate,
    requirePermission(PERMISSIONS.COMMUNITY_MANAGE),
    validate({ params: communityParams, body: updateCommunityBody }),
    communityController.update,
  );

  router.post(
    '/:community/join',
    authenticate,
    requirePermission(PERMISSIONS.COMMUNITY_JOIN),
    validate({ params: communityParams }),
    communityController.join,
  );
  router.delete(
    '/:community/membership',
    authenticate,
    validate({ params: communityParams }),
    communityController.leave,
  );
  router.get(
    '/:community/members',
    authenticate,
    validate({ params: communityParams, query: paginationQuery }),
    communityController.members,
  );
  router.get(
    '/:community/posts',
    optionalAuthenticate,
    validate({ params: communityParams, query: listPostsQuery.omit({ community: true }) }),
    communityController.posts,
  );

  return router;
}

export function createMembershipRouter() {
  const router = Router();
  router.get('/me', authenticate, communityController.mine);
  return router;
}
