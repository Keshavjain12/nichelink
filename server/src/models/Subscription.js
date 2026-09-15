import mongoose from 'mongoose';
import { SUBSCRIPTION_STATUSES } from '../constants/plans.js';

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, enum: ['stripe', 'complimentary'], default: 'stripe' },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    stripePriceId: { type: String },
    status: { type: String, enum: SUBSCRIPTION_STATUSES, required: true },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: { type: Date },
    endedAt: { type: Date },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

subscriptionSchema.index({ user: 1, updatedAt: -1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 }, { unique: true, sparse: true });
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
