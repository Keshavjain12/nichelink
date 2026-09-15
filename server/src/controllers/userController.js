import * as userService from '../services/userService.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';

export async function profile(req, res) {
  sendSuccess(res, { data: await userService.getProfile(req.params.username, req.user) });
}

export async function communities(req, res) {
  sendSuccess(res, { data: await userService.getProfileCommunities(req.params.username, req.user) });
}

export async function updateMe(req, res) {
  const user = await userService.updateProfile(req.user.id, req.body);
  sendSuccess(res, { data: { user }, message: 'Profile updated' });
}

export async function uploadAvatar(req, res) {
  if (!req.file) throw ApiError.badRequest('Attach an image file in the "image" field');
  const user = await userService.updateAvatar(req.user.id, req.file);
  sendSuccess(res, { data: { user }, message: 'Avatar updated' });
}

export async function removeAvatar(req, res) {
  const user = await userService.removeAvatar(req.user.id);
  sendSuccess(res, { data: { user }, message: 'Avatar removed' });
}
