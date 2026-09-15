import mongoose from 'mongoose';
import { CONTENT_LIMITS, CONTENT_STATUS } from '../constants/content.js';

const commentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    // Top-level ancestor: lets a whole thread load with a single indexed query.
    root: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    depth: { type: Number, default: 0, min: 0, max: CONTENT_LIMITS.COMMENT_MAX_DEPTH - 1 },
    content: { type: String, required: true, trim: true, maxlength: CONTENT_LIMITS.COMMENT_MAX },
    replyCount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: Object.values(CONTENT_STATUS), default: CONTENT_STATUS.PUBLISHED },
    editedAt: { type: Date },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

commentSchema.index({ post: 1, parent: 1, createdAt: 1 });
commentSchema.index({ root: 1, createdAt: 1 });
commentSchema.index({ author: 1, createdAt: -1 });

export const Comment = mongoose.model('Comment', commentSchema);
