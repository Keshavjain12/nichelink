import { Router } from 'express';
import * as commentController from '../controllers/commentController.js';
import * as postController from '../controllers/postController.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  authenticate,
  optionalAuthenticate,
  requirePermission,
} from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import {
  createCommentBody,
  listCommentsQuery,
  updateCommentBody,
} from '../validators/commentValidators.js';
import { idParams } from '../validators/common.js';
import {
  createPostBody,
  deletePostBody,
  listPostsQuery,
  updatePostBody,
} from '../validators/postValidators.js';

export function createPostRouter({ limiters }) {
  const router = Router();

  router.get('/', optionalAuthenticate, validate({ query: listPostsQuery }), postController.list);
  router.post(
    '/',
    authenticate,
    requirePermission(PERMISSIONS.POST_CREATE),
    limiters.write,
    validate({ body: createPostBody }),
    postController.create,
  );

  router.get('/:id', authenticate, validate({ params: idParams }), postController.detail);
  router.patch(
    '/:id',
    authenticate,
    limiters.write,
    validate({ params: idParams, body: updatePostBody }),
    postController.update,
  );
  router.delete(
    '/:id',
    authenticate,
    validate({ params: idParams, body: deletePostBody }),
    postController.remove,
  );

  router.put(
    '/:id/reactions',
    authenticate,
    requirePermission(PERMISSIONS.REACTION_TOGGLE),
    validate({ params: idParams }),
    postController.like,
  );
  router.delete(
    '/:id/reactions',
    authenticate,
    requirePermission(PERMISSIONS.REACTION_TOGGLE),
    validate({ params: idParams }),
    postController.unlike,
  );

  router.get(
    '/:id/comments',
    authenticate,
    validate({ params: idParams, query: listCommentsQuery }),
    postController.listComments,
  );
  router.post(
    '/:id/comments',
    authenticate,
    requirePermission(PERMISSIONS.COMMENT_CREATE),
    limiters.write,
    validate({ params: idParams, body: createCommentBody }),
    postController.createComment,
  );

  return router;
}

export function createCommentRouter({ limiters }) {
  const router = Router();
  router.patch(
    '/:id',
    authenticate,
    limiters.write,
    validate({ params: idParams, body: updateCommentBody }),
    commentController.update,
  );
  router.delete('/:id', authenticate, validate({ params: idParams }), commentController.remove);
  return router;
}
