import mongoose from 'mongoose';

const projectInterestSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, trim: true, maxlength: 1000, default: '' },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  },
  { timestamps: true },
);

projectInterestSchema.index({ project: 1, user: 1 }, { unique: true });
projectInterestSchema.index({ project: 1, createdAt: -1 });
projectInterestSchema.index({ user: 1, createdAt: -1 });

export const ProjectInterest = mongoose.model('ProjectInterest', projectInterestSchema);
