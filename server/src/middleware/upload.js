import multer from 'multer';
import { env } from '../config/env.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { UPLOAD_LIMITS } from '../constants/content.js';
import { ApiError } from '../utils/ApiError.js';

const imageMultipart = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_LIMITS.MAX_IMAGE_BYTES, files: 1, fields: 5 },
  fileFilter: (_req, file, callback) => {
    if (UPLOAD_LIMITS.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) return callback(null, true);
    return callback(
      new ApiError(400, 'Only JPEG, PNG, WebP or GIF images are allowed', {
        code: ERROR_CODES.UPLOAD_ERROR,
      }),
    );
  },
});

export function requireUploadsConfigured(_req, _res, next) {
  if (!env.features.uploads) throw ApiError.featureNotConfigured('Image uploads');
  next();
}

/** Parses a single `image` field into memory; the service verifies magic bytes before upload. */
export const singleImage = imageMultipart.single('image');
