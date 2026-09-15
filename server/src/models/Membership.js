import mongoose from 'mongoose';
import { COMMUNITY_ROLES } from '../constants/roles.js';

const membershipSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
    role: { type: String, enum: Object.values(COMMUNITY_ROLES), default: COMMUNITY_ROLES.MEMBER },
    status: { type: String, enum: ['active', 'banned'], default: 'active' },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

membershipSchema.index({ user: 1, community: 1 }, { unique: true });
membershipSchema.index({ community: 1, status: 1, role: 1, joinedAt: -1 });
membershipSchema.index({ user: 1, status: 1, joinedAt: -1 });

export const Membership = mongoose.model('Membership', membershipSchema);
