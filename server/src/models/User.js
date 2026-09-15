import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { SUBSCRIPTION_STATUSES, PLANS } from '../constants/plans.js';
import { ACCOUNT_STATUS, PERSISTED_ROLES, ROLES } from '../constants/roles.js';

// A low cost factor keeps the test suite fast; production uses the recommended 12 rounds.
const BCRYPT_COST = env.isTest ? 4 : 12;

const imageSchema = new mongoose.Schema(
  { url: { type: String, required: true }, publicId: { type: String } },
  { _id: false },
);

const subscriptionSnapshotSchema = new mongoose.Schema(
  {
    plan: { type: String, enum: Object.values(PLANS), default: PLANS.FREE },
    status: { type: String, enum: SUBSCRIPTION_STATUSES, default: 'none' },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9_]+$/,
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    password: { type: String, required: true, select: false },
    avatar: { type: imageSchema, default: undefined },
    headline: { type: String, trim: true, maxlength: 120, default: '' },
    bio: { type: String, trim: true, maxlength: 600, default: '' },
    location: { type: String, trim: true, maxlength: 80, default: '' },
    website: { type: String, trim: true, maxlength: 200, default: '' },
    skills: { type: [String], default: [] },
    interests: { type: [String], default: [] },

    role: { type: String, enum: PERSISTED_ROLES, default: ROLES.FREE },
    status: { type: String, enum: Object.values(ACCOUNT_STATUS), default: ACCOUNT_STATUS.ACTIVE },
    suspendedAt: { type: Date },
    suspensionReason: { type: String, maxlength: 500 },

    stripeCustomerId: { type: String, select: false },
    subscription: { type: subscriptionSnapshotSchema, default: () => ({}) },

    passwordChangedAt: { type: Date },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ stripeCustomerId: 1 }, { unique: true, sparse: true });
userSchema.index(
  { name: 'text', username: 'text', headline: 'text', skills: 'text' },
  { weights: { username: 10, name: 8, skills: 4, headline: 2 }, name: 'user_text' },
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, BCRYPT_COST);
  if (!this.isNew) this.passwordChangedAt = new Date();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.stripeCustomerId;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
export { BCRYPT_COST };
