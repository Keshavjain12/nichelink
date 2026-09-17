import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { PLAN_CATALOG, PLANS } from '../constants/plans.js';
import { getStripe } from './stripeClient.js';

const PRICE_CACHE_TTL_MS = 10 * 60 * 1000;
/** A failed lookup is retried sooner than a good price is refreshed, but not on every request. */
const PRICE_FAILURE_RETRY_MS = 60 * 1000;
/** `/config` loads on every page view; a slow Stripe must not hold it open for the client's retry budget. */
const PRICE_LOOKUP_OPTIONS = { timeout: 5_000, maxNetworkRetries: 0 };
/** Stripe amounts are in minor units, except for these currencies, which have none. */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'ugx',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
]);
const MINOR_UNIT_DIVISOR = 100;

let cached = null;
let pendingLookup = null;

function toMajorUnits(amount, currency) {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase()) ? amount : amount / MINOR_UNIT_DIVISOR;
}

async function fetchProPrice() {
  const price = await getStripe().prices.retrieve(
    env.STRIPE_PRO_PRICE_ID,
    {},
    PRICE_LOOKUP_OPTIONS,
  );
  if (typeof price.unit_amount !== 'number' || !price.recurring) {
    throw new Error('The Pro price is not a recurring price with a fixed amount');
  }
  return {
    price: toMajorUnits(price.unit_amount, price.currency),
    currency: price.currency,
    interval: price.recurring.interval,
    intervalCount: price.recurring.interval_count ?? 1,
  };
}

function cacheFor(value, ttlMs) {
  cached = { value, expiresAt: Date.now() + ttlMs };
  return value;
}

/** Resolves the live Pro price, or null when the catalog price should be shown instead. Never throws. */
async function resolveProPrice() {
  if (!env.features.payments) return null;
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  pendingLookup ??= fetchProPrice()
    .then(
      (value) => cacheFor(value, PRICE_CACHE_TTL_MS),
      (error) => {
        logger.warn(
          { err: error, priceId: env.STRIPE_PRO_PRICE_ID },
          'Could not load the Pro price from Stripe; showing the catalog price',
        );
        return cacheFor(null, PRICE_FAILURE_RETRY_MS);
      },
    )
    .finally(() => {
      pendingLookup = null;
    });
  return pendingLookup;
}

export async function getPlanCatalog() {
  const proPrice = await resolveProPrice();
  return PLAN_CATALOG.map((plan) => {
    const resolved = { ...plan };
    if (proPrice) {
      // The Free plan follows Pro's billing currency and interval so both cards render in the same terms.
      Object.assign(resolved, {
        currency: proPrice.currency,
        interval: proPrice.interval,
        intervalCount: proPrice.intervalCount,
      });
      if (plan.id === PLANS.PRO) resolved.price = proPrice.price;
    }
    return resolved;
  });
}

export function clearPlanPriceCache() {
  cached = null;
  pendingLookup = null;
}
