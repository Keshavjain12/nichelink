import { logger } from '../config/logger.js';
import { ENTITLED_SUBSCRIPTION_STATUSES } from '../constants/plans.js';
import { ROLES } from '../constants/roles.js';
import { User } from '../models/index.js';
import { RENEWAL_GRACE_MS } from '../services/accessService.js';
import { refreshUserEntitlement } from '../services/subscriptionService.js';

/**
 * Safety net for missed webhooks: access is already denied at request time once a period lapses,
 * this job makes the persisted role and plan snapshot match (for admin metrics and UI).
 */
export async function expireLapsedSubscriptions(now = Date.now()) {
  const lapsed = await User.find({
    role: ROLES.PRO,
    $or: [
      { 'subscription.status': { $nin: ENTITLED_SUBSCRIPTION_STATUSES } },
      { 'subscription.currentPeriodEnd': { $lt: new Date(now - RENEWAL_GRACE_MS) } },
    ],
  })
    .select('_id')
    .limit(500)
    .lean();

  for (const { _id } of lapsed) {
    await refreshUserEntitlement(_id);
    // A stored record may still say "active" if its webhook never arrived; force the snapshot down.
    await User.updateOne(
      { _id, role: ROLES.PRO, 'subscription.currentPeriodEnd': { $lt: new Date(now - RENEWAL_GRACE_MS) } },
      { $set: { role: ROLES.FREE, 'subscription.plan': 'free' } },
    );
  }

  if (lapsed.length > 0) logger.info({ count: lapsed.length }, 'Expired lapsed Pro subscriptions');
  return lapsed.length;
}
