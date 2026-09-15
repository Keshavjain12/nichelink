import mongoose from 'mongoose';
import { REACTION_TYPES } from '../constants/content.js';

const reactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    type: { type: String, enum: REACTION_TYPES, default: 'like' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// One reaction per user per post; also serves "which of these posts did I like?" lookups.
reactionSchema.index({ user: 1, post: 1 }, { unique: true });
reactionSchema.index({ post: 1, createdAt: -1 });

export const Reaction = mongoose.model('Reaction', reactionSchema);
