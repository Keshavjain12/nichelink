import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { ApiError } from '../utils/ApiError.js';

let configured = false;

function getClient() {
  if (!env.features.uploads) throw ApiError.featureNotConfigured('Image uploads');
  if (!configured) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** File types are decided by magic bytes, never by the client-supplied name or MIME type. */
const IMAGE_SIGNATURES = [
  { mime: 'image/jpeg', matches: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  { mime: 'image/png', matches: (buffer) => buffer.subarray(0, 8).equals(PNG_SIGNATURE) },
  { mime: 'image/gif', matches: (buffer) => buffer.subarray(0, 4).toString('ascii') === 'GIF8' },
  {
    mime: 'image/webp',
    matches: (buffer) =>
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
];

export function detectImageMime(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  return IMAGE_SIGNATURES.find((signature) => signature.matches(buffer))?.mime ?? null;
}

const UPLOAD_PRESETS = Object.freeze({
  post: { folder: 'posts', transformation: [{ width: 1600, height: 1600, crop: 'limit' }] },
  avatar: { folder: 'avatars', transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'auto' }] },
});

export const userAssetFolder = (userId) => `nichelink/users/${userId}`;

export async function uploadImage(file, { userId, purpose }) {
  const client = getClient();
  if (!file?.buffer) throw ApiError.badRequest('Attach an image file in the "image" field');
  if (!detectImageMime(file.buffer)) {
    throw new ApiError(400, 'Upload a valid JPEG, PNG, WebP or GIF image', { code: ERROR_CODES.UPLOAD_ERROR });
  }

  const preset = UPLOAD_PRESETS[purpose];
  let result;
  try {
    result = await new Promise((resolve, reject) => {
      const stream = client.uploader.upload_stream(
        {
          folder: `${userAssetFolder(userId)}/${preset.folder}`,
          resource_type: 'image',
          allowed_formats: ['jpg', 'png', 'webp', 'gif'],
          transformation: preset.transformation,
          unique_filename: true,
          overwrite: false,
        },
        (error, response) => (error ? reject(error) : resolve(response)),
      );
      stream.end(file.buffer);
    });
  } catch (error) {
    logger.error({ err: error, userId }, 'Cloudinary upload failed');
    throw new ApiError(502, 'Image upload failed, please try again', { code: ERROR_CODES.UPLOAD_ERROR });
  }

  return {
    url: client.url(result.public_id, {
      secure: true,
      version: result.version,
      fetch_format: 'auto',
      quality: 'auto',
    }),
    publicId: result.public_id,
    width: result.width,
    height: result.height,
  };
}

/** Rejects image references that were not uploaded by this user through our API. */
export function assertOwnedImages(images, userId) {
  if (!images?.length) return;
  if (!env.features.uploads) throw ApiError.featureNotConfigured('Image uploads');

  const folderPrefix = `${userAssetFolder(userId)}/`;
  const urlPrefix = `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/`;
  const foreign = images.some((image) => !image.publicId.startsWith(folderPrefix) || !image.url.startsWith(urlPrefix));
  if (foreign) throw ApiError.forbidden('Images must be uploaded through NicheLink by the author');
}

/** Best-effort cleanup; failures are logged for follow-up rather than failing the user's request. */
export async function deleteImages(publicIds) {
  if (!env.features.uploads || !publicIds?.length) return;
  try {
    await getClient().api.delete_resources(publicIds);
  } catch (error) {
    logger.error({ err: error, publicIds }, 'Failed to delete Cloudinary assets');
  }
}
