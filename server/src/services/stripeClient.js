import Stripe from 'stripe';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

let client = null;

/** Lazily constructed so the API boots (with payments disabled) when Stripe keys are absent. */
export function getStripe() {
  if (!env.features.payments) throw ApiError.featureNotConfigured('Payments');
  client ??= new Stripe(env.STRIPE_SECRET_KEY, {
    maxNetworkRetries: 2,
    timeout: 20_000,
    appInfo: { name: 'NicheLink' },
  });
  return client;
}
