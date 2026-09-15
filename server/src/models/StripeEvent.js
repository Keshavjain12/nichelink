import mongoose from 'mongoose';

const RETENTION_SECONDS = 30 * 24 * 60 * 60;

/** Processed webhook event ids — makes webhook handling idempotent across Stripe retries. */
const stripeEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

stripeEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });

export const StripeEvent = mongoose.model('StripeEvent', stripeEventSchema);
