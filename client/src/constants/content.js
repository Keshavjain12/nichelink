export const COMMUNITY_CATEGORIES = ['Engineering', 'AI & Data', 'Product', 'Design', 'Writing', 'Business', 'Lifestyle'];

export const PROJECT_TYPES = [
  { value: 'side-project', label: 'Side project' },
  { value: 'startup', label: 'Startup' },
  { value: 'open-source', label: 'Open source' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'contract', label: 'Contract' },
  { value: 'full-time', label: 'Full-time role' },
];

export const PROJECT_COMMITMENTS = [
  { value: 'few-hours-week', label: 'A few hours a week' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'full-time', label: 'Full-time' },
];

export const PROJECT_COMPENSATION = [
  { value: 'paid', label: 'Paid' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue-share', label: 'Revenue share' },
  { value: 'volunteer', label: 'Volunteer' },
];

export const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or self-promotion' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'off-topic', label: 'Off-topic for this community' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Something else' },
];

export const LIMITS = Object.freeze({
  POST_TITLE_MIN: 5,
  POST_TITLE_MAX: 160,
  POST_MAX_TAGS: 5,
  POST_MAX_IMAGES: 4,
  COMMENT_MAX: 5000,
  COMMENT_MAX_DEPTH: 4,
  MESSAGE_MAX: 2000,
  MAX_IMAGE_BYTES: 5 * 1024 * 1024,
});

export const labelFor = (options, value) => options.find((option) => option.value === value)?.label ?? value;
