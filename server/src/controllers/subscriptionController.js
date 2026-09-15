import * as subscriptionService from '../services/subscriptionService.js';
import { sendSuccess } from '../utils/response.js';

export async function me(req, res) {
  sendSuccess(res, { data: await subscriptionService.getSubscriptionStatus(req.user.id) });
}

export async function checkout(req, res) {
  sendSuccess(res, { data: await subscriptionService.createCheckoutSession(req.user) });
}

export async function confirm(req, res) {
  sendSuccess(res, { data: await subscriptionService.confirmCheckoutSession(req.user, req.body.sessionId) });
}

export async function portal(req, res) {
  sendSuccess(res, { data: await subscriptionService.createBillingPortalSession(req.user) });
}

export async function cancel(req, res) {
  const status = await subscriptionService.setCancelAtPeriodEnd(req.user, true);
  sendSuccess(res, { data: status, message: 'Your Pro membership will end at the close of this billing period' });
}

export async function resume(req, res) {
  const status = await subscriptionService.setCancelAtPeriodEnd(req.user, false);
  sendSuccess(res, { data: status, message: 'Your Pro membership will renew automatically' });
}

/** Mounted with a raw body parser — Stripe signatures are computed over the exact bytes. */
export async function webhook(req, res) {
  res.json(await subscriptionService.handleWebhook(req.body, req.get('stripe-signature')));
}
