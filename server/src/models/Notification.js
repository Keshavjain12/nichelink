import mongoose from 'mongoose';
import { NOTIFICATION_TYPES } from '../constants/content.js';

const NOTIFICATION_RETENTION_SECONDS = 180 * 24 * 60 * 60;

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: Object.values(NOTIFICATION_TYPES), required: true },
    entityType: { type: String, enum: ['Post', 'Comment', 'Conversation', 'Project', 'User', 'Report'] },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    title: { type: String, required: true, maxlength: 160 },
    body: { type: String, maxlength: 280, default: '' },
    link: { type: String, maxlength: 300, default: '' },
    count: { type: Number, default: 1, min: 1 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, readAt: 1, updatedAt: -1 });
notificationSchema.index({ recipient: 1, updatedAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, entityId: 1, readAt: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: NOTIFICATION_RETENTION_SECONDS });

export const Notification = mongoose.model('Notification', notificationSchema);
