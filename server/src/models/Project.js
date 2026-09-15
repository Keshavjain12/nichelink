import mongoose from 'mongoose';
import {
  CONTENT_LIMITS,
  PROJECT_COMMITMENTS,
  PROJECT_COMPENSATION,
  PROJECT_TYPES,
} from '../constants/content.js';

const projectSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
    summary: { type: String, trim: true, maxlength: 200, default: '' },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: CONTENT_LIMITS.PROJECT_DESCRIPTION_MAX,
    },
    requiredSkills: { type: [String], default: [] },
    // Lowercased copy of requiredSkills for case-insensitive, index-backed filtering.
    skillKeys: { type: [String], default: [], select: false },
    projectType: { type: String, enum: PROJECT_TYPES, required: true },
    commitment: { type: String, enum: PROJECT_COMMITMENTS, required: true },
    compensation: { type: String, enum: PROJECT_COMPENSATION, required: true },
    remote: { type: Boolean, default: true },
    location: { type: String, trim: true, maxlength: 80, default: '' },
    status: { type: String, enum: ['open', 'closed', 'deleted'], default: 'open' },
    interestCount: { type: Number, default: 0, min: 0 },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

projectSchema.index({ status: 1, createdAt: -1 });
projectSchema.index({ author: 1, status: 1, createdAt: -1 });
projectSchema.index({ status: 1, skillKeys: 1, createdAt: -1 });

projectSchema.pre('save', function syncSkillKeys() {
  if (this.isModified('requiredSkills')) {
    this.skillKeys = this.requiredSkills.map((skill) => skill.toLowerCase());
  }
});
projectSchema.index(
  { title: 'text', summary: 'text', description: 'text', requiredSkills: 'text' },
  { weights: { title: 10, requiredSkills: 6, summary: 4, description: 1 }, name: 'project_text' },
);

export const Project = mongoose.model('Project', projectSchema);
