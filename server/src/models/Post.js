import mongoose from 'mongoose';
import { CONTENT_LIMITS, CONTENT_STATUS } from '../constants/content.js';
import { COMMUNITY_ACCESS } from '../constants/roles.js';

const postImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    width: Number,
    height: Number,
  },
  { _id: false },
);

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
    // Denormalized from the community so feeds can filter Pro content without a join.
    communityAccess: { type: String, enum: Object.values(COMMUNITY_ACCESS), required: true },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: CONTENT_LIMITS.POST_TITLE_MIN,
      maxlength: CONTENT_LIMITS.POST_TITLE_MAX,
    },
    content: { type: String, required: true, maxlength: CONTENT_LIMITS.POST_CONTENT_MAX_HTML },
    contentText: { type: String, default: '', maxlength: CONTENT_LIMITS.POST_CONTENT_MAX_TEXT },
    excerpt: { type: String, default: '' },
    images: { type: [postImageSchema], default: [] },
    tags: { type: [String], default: [] },
    reactionCount: { type: Number, default: 0, min: 0 },
    commentCount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: Object.values(CONTENT_STATUS), default: CONTENT_STATUS.PUBLISHED },
    editedAt: { type: Date },
    deletedAt: { type: Date },
    moderation: {
      type: new mongoose.Schema(
        {
          removedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          reason: { type: String, maxlength: 300 },
          removedAt: Date,
        },
        { _id: false },
      ),
      default: undefined,
    },
  },
  { timestamps: true },
);

postSchema.index({ community: 1, status: 1, createdAt: -1 });
postSchema.index({ status: 1, communityAccess: 1, createdAt: -1 });
postSchema.index({ author: 1, status: 1, createdAt: -1 });
postSchema.index({ tags: 1, createdAt: -1 });
postSchema.index(
  { title: 'text', contentText: 'text', tags: 'text' },
  { weights: { title: 10, tags: 5, contentText: 2 }, name: 'post_text' },
);

export const Post = mongoose.model('Post', postSchema);
