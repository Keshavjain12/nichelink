import mongoose from 'mongoose';
import {
  CONTENT_LIMITS,
  REPORT_REASONS,
  REPORT_STATUS,
  REPORT_TARGET_TYPES,
} from '../constants/content.js';

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: REPORT_TARGET_TYPES, required: true },
    target: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'targetType' },
    // Owner of the reported content, stored so moderators can act on the user directly.
    targetOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, trim: true, maxlength: CONTENT_LIMITS.REPORT_DETAILS_MAX, default: '' },
    status: { type: String, enum: Object.values(REPORT_STATUS), default: REPORT_STATUS.OPEN },
    resolution: {
      type: new mongoose.Schema(
        {
          action: { type: String, enum: ['none', 'content_removed', 'user_suspended'] },
          note: { type: String, maxlength: 500 },
          resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          resolvedAt: Date,
        },
        { _id: false },
      ),
      default: undefined,
    },
  },
  { timestamps: true },
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, target: 1, status: 1 });
// A user can hold only one open report per target.
reportSchema.index(
  { reporter: 1, targetType: 1, target: 1 },
  { unique: true, partialFilterExpression: { status: REPORT_STATUS.OPEN } },
);

export const Report = mongoose.model('Report', reportSchema);
