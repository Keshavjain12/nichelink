import { CONTENT_STATUS } from '../constants/content.js';
import { Membership, Post, Project, User } from '../models/index.js';
import { toPublicProfile, toSessionUser } from '../serializers/userSerializer.js';
import { ApiError } from '../utils/ApiError.js';
import { readableAccessTypes } from './accessService.js';
import { listUserCommunities } from './communityService.js';
import { deleteImages, uploadImage } from './uploadService.js';

function dedupeCaseInsensitive(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function findUserByUsername(username) {
  const user = await User.findOne({ username }).lean();
  if (!user) throw ApiError.notFound('Member not found');
  return user;
}

export async function getProfile(username, viewer) {
  const user = await findUserByUsername(username);
  const [postCount, communityCount, projectCount] = await Promise.all([
    Post.countDocuments({
      author: user._id,
      status: CONTENT_STATUS.PUBLISHED,
      communityAccess: { $in: readableAccessTypes(viewer) },
    }),
    Membership.countDocuments({ user: user._id, status: 'active' }),
    Project.countDocuments({ author: user._id, status: { $in: ['open', 'closed'] } }),
  ]);

  return {
    ...toPublicProfile(user),
    stats: { postCount, communityCount, projectCount },
    isSelf: viewer.id === String(user._id),
  };
}

export async function getProfileCommunities(username, viewer) {
  const user = await findUserByUsername(username);
  return listUserCommunities(user._id, viewer);
}

export async function updateProfile(userId, updates) {
  const changes = { ...updates };
  if (changes.skills) changes.skills = dedupeCaseInsensitive(changes.skills);
  if (changes.interests) changes.interests = dedupeCaseInsensitive(changes.interests);

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: changes },
    { returnDocument: 'after', runValidators: true },
  ).lean();
  if (!user) throw ApiError.unauthorized();
  return toSessionUser(user);
}

export async function updateAvatar(userId, file) {
  const avatar = await uploadImage(file, { userId, purpose: 'avatar' });
  const previous = await User.findByIdAndUpdate(
    userId,
    { $set: { avatar } },
    { returnDocument: 'before' },
  ).lean();
  if (previous?.avatar?.publicId) await deleteImages([previous.avatar.publicId]);
  return toSessionUser(await User.findById(userId).lean());
}

export async function removeAvatar(userId) {
  const previous = await User.findByIdAndUpdate(
    userId,
    { $unset: { avatar: 1 } },
    { returnDocument: 'before' },
  ).lean();
  if (previous?.avatar?.publicId) await deleteImages([previous.avatar.publicId]);
  return toSessionUser(await User.findById(userId).lean());
}
