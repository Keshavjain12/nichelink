import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { NOTIFICATION_TYPES } from '../constants/content.js';
import { ENTITLED_SUBSCRIPTION_STATUSES, PLANS } from '../constants/plans.js';
import { ROLES } from '../constants/roles.js';
import { SOCKET_EVENTS } from '../constants/socketEvents.js';
import { StripeEvent, Subscription, User } from '../models/index.js';
import { emitToUser } from '../sockets/realtime.js';
import { ApiError } from '../utils/ApiError.js';
import { isSubscriptionEntitled, resolveEffectiveRole } from './accessService.js';
import { notify } from './notificationService.js';
import { getStripe } from './stripeClient.js';

const HANDLED_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'invoice.paid',
  'invoice.payment_failed',
]);

const toDate = (unixSeconds) => (unixSeconds ? new Date(unixSeconds * 1000) : undefined);
const idOf = (value) => (typeof value === 'string' ? value : value?.id);

/* -------------------------------------------------------------------------- */
/*                                Status views                                */
/* -------------------------------------------------------------------------- */

export async function getSubscriptionStatus(userId) {
  const [user, latest] = await Promise.all([
    User.findById(userId).select('+stripeCustomerId role subscription').lean(),
    Subscription.findOne({ user: userId }).sort({ updatedAt: -1 }).lean(),
  ]);
  if (!user) throw ApiError.unauthorized();

  const role = resolveEffectiveRole(user);
  return {
    plan: role === ROLES.PRO ? PLANS.PRO : PLANS.FREE,
    role,
    status: user.subscription?.status ?? 'none',
    currentPeriodEnd: user.subscription?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: Boolean(user.subscription?.cancelAtPeriodEnd),
    provider: latest?.provider ?? null,
    paymentsEnabled: env.features.payments,
    paymentsMode: env.features.paymentsMode,
    canManageBilling: env.features.payments && Boolean(user.stripeCustomerId),
  };
}

/* -------------------------------------------------------------------------- */
/*                         Entitlement synchronisation                         */
/* -------------------------------------------------------------------------- */

function pickAuthoritativeSubscription(subscriptions) {
  const entitled = subscriptions
    .filter((subscription) => isSubscriptionEntitled(subscription))
    .sort(
      (a, b) =>
        (b.currentPeriodEnd?.getTime() ?? Infinity) - (a.currentPeriodEnd?.getTime() ?? Infinity),
    );
  return entitled[0] ?? subscriptions[0] ?? null;
}

/**
 * Recomputes a user's plan snapshot and persisted role from their stored subscription records.
 * This is the only code path that grants or revokes the ProMember role.
 */
export async function refreshUserEntitlement(userId) {
  const user = await User.findById(userId).select('role subscription name').lean();
  if (!user) return null;

  const subscriptions = await Subscription.find({ user: userId }).sort({ updatedAt: -1 }).lean();
  const chosen = pickAuthoritativeSubscription(subscriptions);
  const entitled = Boolean(chosen && isSubscriptionEntitled(chosen));
  const snapshot = {
    plan: entitled ? PLANS.PRO : PLANS.FREE,
    status: chosen?.status ?? 'none',
    currentPeriodEnd: chosen?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: Boolean(chosen?.cancelAtPeriodEnd),
  };

  const previousRole = resolveEffectiveRole(user);
  await User.updateOne({ _id: userId }, { $set: { subscription: snapshot } });
  await User.updateOne(
    { _id: userId, role: { $ne: ROLES.ADMIN } },
    { $set: { role: entitled ? ROLES.PRO : ROLES.FREE } },
  );
  const nextRole = resolveEffectiveRole({ ...user, subscription: snapshot });

  if (previousRole !== nextRole) {
    const upgraded = nextRole === ROLES.PRO;
    logger.info(
      { userId: String(userId), from: previousRole, to: nextRole },
      'Subscription entitlement changed',
    );
    await notify({
      recipient: userId,
      type: NOTIFICATION_TYPES.SUBSCRIPTION,
      title: upgraded ? 'Welcome to NicheLink Pro 🎉' : 'Your Pro membership has ended',
      body: upgraded
        ? 'Posting, unlimited messaging, Pro communities and Project Match are now unlocked.'
        : 'You are now on the Free plan. Upgrade again any time to regain Pro features.',
      link: '/settings/billing',
    });
  }
  // Tell every open tab to refresh its session so permissions update without a reload.
  emitToUser(userId, SOCKET_EVENTS.SESSION_UPDATED, { reason: 'subscription', role: nextRole });
  return snapshot;
}

async function resolveUserForStripe({ customerId, userIdHint }) {
  if (customerId) {
    const byCustomer = await User.findOne({ stripeCustomerId: customerId })
      .select('+stripeCustomerId')
      .lean();
    if (byCustomer) return byCustomer;
  }
  if (!userIdHint || !/^[a-f0-9]{24}$/i.test(userIdHint)) return null;

  const user = await User.findById(userIdHint).select('+stripeCustomerId').lean();
  if (!user) return null;
  if (user.stripeCustomerId && customerId && user.stripeCustomerId !== customerId) {
    logger.warn(
      { userId: userIdHint, customerId },
      'Stripe customer does not match the user; ignoring',
    );
    return null;
  }
  if (!user.stripeCustomerId && customerId) {
    await User.updateOne(
      { _id: user._id, stripeCustomerId: { $exists: false } },
      { $set: { stripeCustomerId: customerId } },
    );
  }
  return user;
}

/** Persists a Stripe subscription object and refreshes the owner's entitlement. */
export async function applyStripeSubscription(stripeSubscription, { userIdHint } = {}) {
  const customerId = idOf(stripeSubscription.customer);
  const user = await resolveUserForStripe({
    customerId,
    userIdHint: userIdHint ?? stripeSubscription.metadata?.userId,
  });
  if (!user) {
    logger.warn(
      { subscriptionId: stripeSubscription.id, customerId },
      'No user found for Stripe subscription',
    );
    return null;
  }

  // Newer Stripe API versions report billing periods on subscription items.
  const item = stripeSubscription.items?.data?.[0];
  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: stripeSubscription.id },
    {
      $set: {
        user: user._id,
        provider: 'stripe',
        stripeCustomerId: customerId,
        stripePriceId: item?.price?.id,
        status: stripeSubscription.status,
        currentPeriodStart: toDate(
          stripeSubscription.current_period_start ?? item?.current_period_start,
        ),
        currentPeriodEnd: toDate(stripeSubscription.current_period_end ?? item?.current_period_end),
        cancelAtPeriodEnd: Boolean(stripeSubscription.cancel_at_period_end),
        canceledAt: toDate(stripeSubscription.canceled_at),
        endedAt: toDate(stripeSubscription.ended_at),
        lastSyncedAt: new Date(),
      },
    },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );

  await cancelDuplicateSubscriptions(user._id);
  return refreshUserEntitlement(user._id);
}

/**
 * A member only ever needs one paid subscription. Two checkout tabs opened before either is paid
 * produce two payable sessions, and Stripe will happily bill both, so the newest duplicate is
 * cancelled as soon as it lands. Cancelling with proration credits the unused time back to the
 * customer instead of silently keeping the second charge.
 */
async function cancelDuplicateSubscriptions(userId) {
  const active = await Subscription.find({
    user: userId,
    status: { $in: ENTITLED_SUBSCRIPTION_STATUSES },
    stripeSubscriptionId: { $ne: null },
  })
    .sort({ currentPeriodStart: 1, createdAt: 1 })
    .lean();
  if (active.length < 2) return;

  // Keep the one the member paid for first; everything after it is an accident.
  const [, ...duplicates] = active;
  for (const duplicate of duplicates) {
    try {
      await getStripe().subscriptions.cancel(duplicate.stripeSubscriptionId, {
        prorate: true,
        invoice_now: true,
      });
      logger.warn(
        { userId: String(userId), subscriptionId: duplicate.stripeSubscriptionId },
        'Cancelled a duplicate Stripe subscription',
      );
    } catch (error) {
      logger.error(
        { err: error, userId: String(userId), subscriptionId: duplicate.stripeSubscriptionId },
        'Failed to cancel a duplicate Stripe subscription',
      );
    }
  }
}

/** Always re-reads the subscription from Stripe, so event ordering and stale payloads cannot matter. */
export async function syncSubscriptionFromStripe(subscriptionId, options) {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  return applyStripeSubscription(subscription, options);
}

/* -------------------------------------------------------------------------- */
/*                                  Checkout                                  */
/* -------------------------------------------------------------------------- */

async function findOpenCheckoutSession(stripe, customerId) {
  try {
    const { data } = await stripe.checkout.sessions.list({
      customer: customerId,
      status: 'open',
      limit: 5,
    });
    return data.find((session) => session.mode === 'subscription' && session.url) ?? null;
  } catch (error) {
    // Reuse is an optimisation; the duplicate guard above still protects the member.
    logger.warn({ err: error, customerId }, 'Could not list open checkout sessions');
    return null;
  }
}

async function ensureStripeCustomer(user) {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await getStripe().customers.create(
    { email: user.email, name: user.name, metadata: { userId: String(user._id) } },
    { idempotencyKey: `customer-${user._id}` },
  );
  const claimed = await User.updateOne(
    { _id: user._id, stripeCustomerId: { $exists: false } },
    { $set: { stripeCustomerId: customer.id } },
  );
  if (claimed.modifiedCount > 0) return customer.id;

  const current = await User.findById(user._id).select('+stripeCustomerId').lean();
  return current.stripeCustomerId;
}

export async function createCheckoutSession(viewer) {
  const stripe = getStripe();
  const user = await User.findById(viewer.id)
    .select('+stripeCustomerId name email role subscription')
    .lean();
  if (!user) throw ApiError.unauthorized();
  if (user.role === ROLES.ADMIN)
    throw ApiError.conflict('Admin accounts already include every Pro feature');
  if (isSubscriptionEntitled(user.subscription))
    throw ApiError.conflict('You already have an active Pro membership');

  const customerId = await ensureStripeCustomer(user);

  // Reusing the open session keeps a second tab from becoming a second payable session, which
  // Stripe would bill separately. A completed session cannot be paid twice.
  const open = await findOpenCheckoutSession(stripe, customerId);
  if (open) {
    logger.info({ userId: String(user._id), sessionId: open.id }, 'Reusing open checkout session');
    return { url: open.url, sessionId: open.id };
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: String(user._id),
    line_items: [{ price: env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${env.CLIENT_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.CLIENT_URL}/billing/cancel`,
    metadata: { userId: String(user._id) },
    subscription_data: { metadata: { userId: String(user._id) } },
  });

  logger.info(
    { userId: String(user._id), sessionId: session.id },
    'Stripe checkout session created',
  );
  return { url: session.url, sessionId: session.id };
}

/**
 * Fast path for the success page: the server fetches the session from Stripe itself and verifies it
 * belongs to the caller. Webhooks remain the lifecycle source of truth.
 */
export async function confirmCheckoutSession(viewer, sessionId) {
  let session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch (error) {
    if (error?.statusCode === 404 || error?.code === 'resource_missing') {
      throw ApiError.notFound('Checkout session not found');
    }
    throw error;
  }

  if (session.client_reference_id !== viewer.id)
    throw ApiError.notFound('Checkout session not found');

  if (session.status === 'complete' && session.mode === 'subscription' && session.subscription) {
    await syncSubscriptionFromStripe(idOf(session.subscription), { userIdHint: viewer.id });
  }
  return { checkoutStatus: session.status, subscription: await getSubscriptionStatus(viewer.id) };
}

export async function createBillingPortalSession(viewer) {
  const user = await User.findById(viewer.id).select('+stripeCustomerId').lean();
  if (!user?.stripeCustomerId)
    throw ApiError.badRequest('No billing account exists for this user yet');

  const session = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${env.CLIENT_URL}/settings/billing`,
  });
  return { url: session.url };
}

async function findManageableSubscription(userId) {
  const subscription = await Subscription.findOne({
    user: userId,
    provider: 'stripe',
    status: { $in: ENTITLED_SUBSCRIPTION_STATUSES },
  })
    .sort({ currentPeriodEnd: -1 })
    .lean();
  if (!subscription) throw ApiError.notFound('You do not have an active Stripe subscription');
  return subscription;
}

export async function setCancelAtPeriodEnd(viewer, cancel) {
  const subscription = await findManageableSubscription(viewer.id);
  const updated = await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: cancel,
  });
  await applyStripeSubscription(updated, { userIdHint: viewer.id });
  logger.info({ userId: viewer.id, cancel }, 'Subscription cancel_at_period_end updated');
  return getSubscriptionStatus(viewer.id);
}

/* -------------------------------------------------------------------------- */
/*                                  Webhooks                                  */
/* -------------------------------------------------------------------------- */

function subscriptionIdFromInvoice(invoice) {
  return idOf(invoice.subscription) ?? idOf(invoice.parent?.subscription_details?.subscription);
}

async function processStripeEvent(event) {
  const object = event.data.object;
  switch (event.type) {
    case 'checkout.session.completed':
      if (object.mode === 'subscription' && object.subscription) {
        await syncSubscriptionFromStripe(idOf(object.subscription), {
          userIdHint: object.client_reference_id,
        });
      }
      break;
    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const subscriptionId = subscriptionIdFromInvoice(object);
      if (subscriptionId) await syncSubscriptionFromStripe(subscriptionId);
      break;
    }
    default:
      await syncSubscriptionFromStripe(object.id, { userIdHint: object.metadata?.userId });
  }
}

export async function handleWebhook(rawBody, signature) {
  const stripe = getStripe();
  if (!signature || !Buffer.isBuffer(rawBody))
    throw ApiError.badRequest('Missing Stripe signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    logger.warn({ reason: error.message }, 'Rejected Stripe webhook with an invalid signature');
    throw ApiError.badRequest('Invalid Stripe signature');
  }

  if (!HANDLED_EVENTS.has(event.type)) return { received: true, ignored: true };

  try {
    await StripeEvent.create({ eventId: event.id, type: event.type });
  } catch (error) {
    if (error?.code === 11000) {
      logger.info({ eventId: event.id, type: event.type }, 'Duplicate Stripe webhook ignored');
      return { received: true, duplicate: true };
    }
    throw error;
  }

  try {
    await processStripeEvent(event);
  } catch (error) {
    // Forget the event so Stripe's retry can process it again.
    await StripeEvent.deleteOne({ eventId: event.id });
    logger.error(
      { err: error, eventId: event.id, type: event.type },
      'Stripe webhook processing failed',
    );
    throw error;
  }

  logger.info({ eventId: event.id, type: event.type }, 'Stripe webhook processed');
  return { received: true };
}
