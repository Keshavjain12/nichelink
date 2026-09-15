import mongoose from 'mongoose';
import { COMMUNITY_CATEGORIES } from '../constants/content.js';
import { COMMUNITY_ACCESS } from '../constants/roles.js';

const ruleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300, default: '' },
  },
  { _id: false },
);

const communitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 60 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 60 },
    tagline: { type: String, trim: true, maxlength: 140, default: '' },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    icon: { type: String, trim: true, maxlength: 8, default: '💬' },
    accentColor: { type: String, match: /^#[0-9a-fA-F]{6}$/, default: '#4f46e5' },
    banner: {
      type: new mongoose.Schema({ url: String, publicId: String }, { _id: false }),
      default: undefined,
    },
    category: { type: String, enum: COMMUNITY_CATEGORIES, required: true },
    tags: { type: [String], default: [] },
    accessType: { type: String, enum: Object.values(COMMUNITY_ACCESS), default: COMMUNITY_ACCESS.PUBLIC },
    memberCount: { type: Number, default: 0, min: 0 },
    postCount: { type: Number, default: 0, min: 0 },
    rules: { type: [ruleSchema], default: [] },
    isFeatured: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

communitySchema.index({ status: 1, category: 1, memberCount: -1 });
communitySchema.index({ status: 1, isFeatured: 1, memberCount: -1 });
communitySchema.index({ createdAt: -1 });
communitySchema.index(
  { name: 'text', tagline: 'text', description: 'text', tags: 'text' },
  { weights: { name: 10, tags: 6, tagline: 4, description: 1 }, name: 'community_text' },
);

export const Community = mongoose.model('Community', communitySchema);
