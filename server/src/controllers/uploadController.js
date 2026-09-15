import { uploadImage } from '../services/uploadService.js';
import { ApiError } from '../utils/ApiError.js';
import { sendCreated } from '../utils/response.js';

export async function uploadPostImage(req, res) {
  if (!req.file) throw ApiError.badRequest('Attach an image file in the "image" field');
  const image = await uploadImage(req.file, { userId: req.user.id, purpose: 'post' });
  sendCreated(res, { data: image, message: 'Image uploaded' });
}
