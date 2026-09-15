import { Router } from 'express';
import * as uploadController from '../controllers/uploadController.js';
import * as userController from '../controllers/userController.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { authenticate, requirePermission } from '../middleware/authenticate.js';
import { requireUploadsConfigured, singleImage } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { updateProfileBody, usernameParams } from '../validators/userValidators.js';

export function createUserRouter({ limiters }) {
  const router = Router();

  router.patch('/me', authenticate, validate({ body: updateProfileBody }), userController.updateMe);
  router.post(
    '/me/avatar',
    authenticate,
    requirePermission(PERMISSIONS.UPLOAD_AVATAR),
    limiters.upload,
    requireUploadsConfigured,
    singleImage,
    userController.uploadAvatar,
  );
  router.delete('/me/avatar', authenticate, userController.removeAvatar);

  router.get('/:username', authenticate, validate({ params: usernameParams }), userController.profile);
  router.get('/:username/communities', authenticate, validate({ params: usernameParams }), userController.communities);

  return router;
}

export function createUploadRouter({ limiters }) {
  const router = Router();
  router.post(
    '/images',
    authenticate,
    requirePermission(PERMISSIONS.UPLOAD_POST_IMAGE),
    limiters.upload,
    requireUploadsConfigured,
    singleImage,
    uploadController.uploadPostImage,
  );
  return router;
}
