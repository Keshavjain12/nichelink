export const PLANS = Object.freeze({
  FREE: 'free',
  PRO: 'pro',
});

/** Stripe subscription statuses that grant Pro access. past_due keeps access while Stripe retries payment. */
export const ENTITLED_SUBSCRIPTION_STATUSES = Object.freeze(['active', 'trialing', 'past_due']);

export const SUBSCRIPTION_STATUSES = Object.freeze([
  'none',
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused',
]);

export const PLAN_LIMITS = Object.freeze({
  FREE_MESSAGES_PER_DAY: 10,
});

export const PLAN_CATALOG = Object.freeze([
  {
    id: PLANS.FREE,
    name: 'Free',
    priceMonthly: 0,
    features: [
      'Browse every public community',
      'Join public communities',
      'Read discussions, profiles and projects',
      'Like posts and express interest in projects',
      `Up to ${PLAN_LIMITS.FREE_MESSAGES_PER_DAY} direct messages per day`,
    ],
  },
  {
    id: PLANS.PRO,
    name: 'Pro',
    priceMonthly: 12,
    features: [
      'Everything in Free',
      'Publish posts with rich text and images',
      'Comment and reply in discussions',
      'Unlimited direct messages',
      'Access exclusive Pro communities',
      'Post collaboration requests on Project Match',
    ],
  },
]);
