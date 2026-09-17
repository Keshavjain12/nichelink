import Stripe from 'stripe';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { expireLapsedSubscriptions } from '../src/jobs/subscriptionExpiry.js';
import { Notification, StripeEvent, Subscription, User } from '../src/models/index.js';
import {
  bearer,
  buildApp,
  createAdmin,
  createCommunity,
  createFreeUser,
  createProUser,
  joinCommunity,
} from './helpers.js';

const stripeMock = vi.hoisted(() => ({
  customers: { create: vi.fn() },
  checkout: { sessions: { create: vi.fn(), retrieve: vi.fn() } },
  subscriptions: { retrieve: vi.fn(), update: vi.fn() },
  billingPortal: { sessions: { create: vi.fn() } },
}));

vi.mock('../src/services/stripeClient.js', async () => {
  const { default: StripeSdk } = await import('stripe');
  // Real webhook signature verification; only network calls are mocked.
  const { webhooks } = new StripeSdk('sk_test_signature_only');
  return { getStripe: () => ({ ...stripeMock, webhooks }) };
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const signer = new Stripe('sk_test_signature_only').webhooks;
const DAY_S = 24 * 60 * 60;

function stripeSubscription({
  id = 'sub_test_123',
  customer = 'cus_test_123',
  status = 'active',
  userId,
  cancelAtPeriodEnd = false,
}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    id,
    object: 'subscription',
    customer,
    status,
    cancel_at_period_end: cancelAtPeriodEnd,
    canceled_at: status === 'canceled' ? now : null,
    ended_at: status === 'canceled' ? now : null,
    metadata: userId ? { userId } : {},
    items: {
      data: [
        {
          price: { id: 'price_test_pro' },
          current_period_start: now,
          current_period_end: now + 30 * DAY_S,
        },
      ],
    },
  };
}

function signedWebhook(app, event) {
  const payload = JSON.stringify(event);
  const signature = signer.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
  return request(app)
    .post('/api/v1/subscriptions/webhook')
    .set('Content-Type', 'application/json')
    .set('Stripe-Signature', signature)
    .send(payload);
}

const checkoutCompleted = (user, { eventId = 'evt_checkout_1' } = {}) => ({
  id: eventId,
  object: 'event',
  type: 'checkout.session.completed',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'cs_test_abc12345',
      object: 'checkout.session',
      mode: 'subscription',
      status: 'complete',
      client_reference_id: String(user._id),
      customer: 'cus_test_123',
      subscription: 'sub_test_123',
    },
  },
});

describe('subscriptions & Stripe webhooks', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    vi.clearAllMocks();
  });

  it('reports the Free plan for new members', async () => {
    const user = await createFreeUser();
    const res = await request(app).get('/api/v1/subscriptions/me').set(bearer(user)).expect(200);
    expect(res.body.data).toMatchObject({
      plan: 'free',
      role: 'FreeMember',
      status: 'none',
      paymentsEnabled: true,
      paymentsMode: 'test',
    });
  });

  it('creates a Stripe customer and checkout session', async () => {
    const user = await createFreeUser();
    stripeMock.customers.create.mockResolvedValue({ id: 'cus_test_123' });
    stripeMock.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test_abc12345',
      url: 'https://checkout.stripe.com/c/pay/cs_test',
    });

    const res = await request(app)
      .post('/api/v1/subscriptions/checkout')
      .set(bearer(user))
      .expect(200);
    expect(res.body.data.url).toBe('https://checkout.stripe.com/c/pay/cs_test');

    const params = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(params).toMatchObject({
      mode: 'subscription',
      customer: 'cus_test_123',
      client_reference_id: String(user._id),
      line_items: [{ price: 'price_test_pro', quantity: 1 }],
    });
    expect(
      (await User.findById(user._id).select('+stripeCustomerId').lean()).stripeCustomerId,
    ).toBe('cus_test_123');
    // Starting checkout grants nothing.
    expect((await User.findById(user._id).lean()).role).toBe('FreeMember');
  });

  it('refuses checkout for admins and existing Pro members', async () => {
    await request(app)
      .post('/api/v1/subscriptions/checkout')
      .set(bearer(await createAdmin()))
      .expect(409);
    await request(app)
      .post('/api/v1/subscriptions/checkout')
      .set(bearer(await createProUser()))
      .expect(409);
  });

  it('rejects webhooks with missing or invalid signatures', async () => {
    const payload = JSON.stringify(checkoutCompleted({ _id: 'x' }));
    await request(app)
      .post('/api/v1/subscriptions/webhook')
      .set('Content-Type', 'application/json')
      .send(payload)
      .expect(400);
    await request(app)
      .post('/api/v1/subscriptions/webhook')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', 't=1,v1=forged')
      .send(payload)
      .expect(400);
    expect(stripeMock.subscriptions.retrieve).not.toHaveBeenCalled();
  });

  it('Stripe checkout → webhook → Pro access (end to end)', async () => {
    const user = await createFreeUser();
    await User.updateOne({ _id: user._id }, { stripeCustomerId: 'cus_test_123' });
    const community = await createCommunity();
    await joinCommunity(user, community);
    const post = {
      community: community.slug,
      title: 'First post as a Pro member',
      content: '<p>Hello Pro world</p>',
    };

    const denied = await request(app)
      .post('/api/v1/posts')
      .set(bearer(user))
      .send(post)
      .expect(403);
    expect(denied.body.code).toBe('PRO_REQUIRED');

    stripeMock.subscriptions.retrieve.mockResolvedValue(
      stripeSubscription({ userId: String(user._id) }),
    );
    await signedWebhook(app, checkoutCompleted(user)).expect(200);

    expect(stripeMock.subscriptions.retrieve).toHaveBeenCalledWith('sub_test_123');
    const stored = await User.findById(user._id).lean();
    expect(stored.role).toBe('ProMember');
    expect(stored.subscription).toMatchObject({ plan: 'pro', status: 'active' });
    expect(await Subscription.countDocuments({ user: user._id, status: 'active' })).toBe(1);
    expect(await Notification.countDocuments({ recipient: user._id, type: 'subscription' })).toBe(
      1,
    );

    await request(app).post('/api/v1/posts').set(bearer(user)).send(post).expect(201);
    const status = await request(app).get('/api/v1/subscriptions/me').set(bearer(user)).expect(200);
    expect(status.body.data).toMatchObject({
      plan: 'pro',
      role: 'ProMember',
      canManageBilling: true,
    });
  });

  it('processes each event id only once', async () => {
    const user = await createFreeUser();
    stripeMock.subscriptions.retrieve.mockResolvedValue(
      stripeSubscription({ userId: String(user._id) }),
    );

    await signedWebhook(app, checkoutCompleted(user)).expect(200);
    const duplicate = await signedWebhook(app, checkoutCompleted(user)).expect(200);

    expect(duplicate.body.duplicate).toBe(true);
    expect(stripeMock.subscriptions.retrieve).toHaveBeenCalledTimes(1);
    expect(await StripeEvent.countDocuments()).toBe(1);
  });

  it('allows Stripe to retry when processing fails', async () => {
    const user = await createFreeUser();
    stripeMock.subscriptions.retrieve.mockRejectedValueOnce(new Error('Stripe API unavailable'));
    await signedWebhook(app, checkoutCompleted(user)).expect(500);
    expect(await StripeEvent.countDocuments()).toBe(0);

    stripeMock.subscriptions.retrieve.mockResolvedValue(
      stripeSubscription({ userId: String(user._id) }),
    );
    await signedWebhook(app, checkoutCompleted(user)).expect(200);
    expect((await User.findById(user._id).lean()).role).toBe('ProMember');
  });

  it('downgrades on customer.subscription.deleted and ignores stale payloads', async () => {
    const user = await createFreeUser();
    stripeMock.subscriptions.retrieve.mockResolvedValue(
      stripeSubscription({ userId: String(user._id) }),
    );
    await signedWebhook(app, checkoutCompleted(user)).expect(200);

    const canceled = stripeSubscription({ userId: String(user._id), status: 'canceled' });
    stripeMock.subscriptions.retrieve.mockResolvedValue(canceled);
    await signedWebhook(app, {
      id: 'evt_deleted_1',
      type: 'customer.subscription.deleted',
      data: { object: canceled },
    }).expect(200);
    expect((await User.findById(user._id).lean()).role).toBe('FreeMember');

    // An out-of-order "updated" event still carrying status=active must not re-grant access.
    await signedWebhook(app, {
      id: 'evt_updated_stale',
      type: 'customer.subscription.updated',
      data: { object: stripeSubscription({ userId: String(user._id), status: 'active' }) },
    }).expect(200);
    expect((await User.findById(user._id).lean()).role).toBe('FreeMember');

    const community = await createCommunity({ accessType: 'pro' });
    await request(app)
      .post(`/api/v1/communities/${community.slug}/join`)
      .set(bearer(user))
      .expect(403);
  });

  it('confirms a checkout session only for its owner', async () => {
    const owner = await createFreeUser();
    const attacker = await createFreeUser();
    stripeMock.checkout.sessions.retrieve.mockResolvedValue(checkoutCompleted(owner).data.object);
    stripeMock.subscriptions.retrieve.mockResolvedValue(
      stripeSubscription({ userId: String(owner._id) }),
    );

    await request(app)
      .post('/api/v1/subscriptions/checkout/confirm')
      .set(bearer(attacker))
      .send({ sessionId: 'cs_test_abc12345' })
      .expect(404);
    expect((await User.findById(attacker._id).lean()).role).toBe('FreeMember');

    const res = await request(app)
      .post('/api/v1/subscriptions/checkout/confirm')
      .set(bearer(owner))
      .send({ sessionId: 'cs_test_abc12345' })
      .expect(200);
    expect(res.body.data.subscription.plan).toBe('pro');
  });

  it('never trusts client-side "success" signals', async () => {
    const user = await createFreeUser();
    stripeMock.checkout.sessions.retrieve.mockResolvedValue({
      ...checkoutCompleted(user).data.object,
      status: 'open',
    });
    const res = await request(app)
      .post('/api/v1/subscriptions/checkout/confirm?success=true')
      .set(bearer(user))
      .send({ sessionId: 'cs_test_abc12345', status: 'complete', role: 'ProMember' })
      .expect(200);
    expect(res.body.data.subscription.plan).toBe('free');
    expect(stripeMock.subscriptions.retrieve).not.toHaveBeenCalled();
  });

  it('schedules cancellation at period end and resumes', async () => {
    const user = await createFreeUser();
    stripeMock.subscriptions.retrieve.mockResolvedValue(
      stripeSubscription({ userId: String(user._id) }),
    );
    await signedWebhook(app, checkoutCompleted(user)).expect(200);

    stripeMock.subscriptions.update.mockResolvedValue(
      stripeSubscription({ userId: String(user._id), cancelAtPeriodEnd: true }),
    );
    const canceled = await request(app)
      .post('/api/v1/subscriptions/cancel')
      .set(bearer(user))
      .expect(200);
    expect(stripeMock.subscriptions.update).toHaveBeenCalledWith('sub_test_123', {
      cancel_at_period_end: true,
    });
    expect(canceled.body.data).toMatchObject({ plan: 'pro', cancelAtPeriodEnd: true });

    stripeMock.subscriptions.update.mockResolvedValue(
      stripeSubscription({ userId: String(user._id) }),
    );
    const resumed = await request(app)
      .post('/api/v1/subscriptions/resume')
      .set(bearer(user))
      .expect(200);
    expect(resumed.body.data.cancelAtPeriodEnd).toBe(false);
  });

  it('expires lapsed subscriptions when webhooks were missed', async () => {
    const user = await createProUser();
    const lapsedAt = new Date(Date.now() - 5 * DAY_S * 1000);
    // Stored state still says "active" because the cancellation webhook never arrived.
    await User.updateOne({ _id: user._id }, { 'subscription.currentPeriodEnd': lapsedAt });
    await Subscription.updateMany({ user: user._id }, { currentPeriodEnd: lapsedAt });

    // Access is already denied at request time …
    const me = await request(app).get('/api/v1/auth/me').set(bearer(user)).expect(200);
    expect(me.body.data.user.role).toBe('FreeMember');

    // … and the job persists the downgrade.
    expect(await expireLapsedSubscriptions()).toBe(1);
    expect((await User.findById(user._id).lean()).role).toBe('FreeMember');
  });
});
