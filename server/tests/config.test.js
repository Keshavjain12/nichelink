import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PLAN_CATALOG } from '../src/constants/plans.js';
import { clearPlanPriceCache } from '../src/services/pricingService.js';
import { buildApp } from './helpers.js';

const stripeMock = vi.hoisted(() => ({ prices: { retrieve: vi.fn() } }));

vi.mock('../src/services/stripeClient.js', () => ({ getStripe: () => stripeMock }));

const stripePrice = (overrides) => ({
  id: 'price_test_pro',
  object: 'price',
  unit_amount: 1999,
  currency: 'eur',
  recurring: { interval: 'year', interval_count: 1 },
  ...overrides,
});

const planById = (res, id) => res.body.data.plans.find((plan) => plan.id === id);
const catalogPro = PLAN_CATALOG.find((plan) => plan.id === 'pro');

describe('GET /config', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    vi.clearAllMocks();
    clearPlanPriceCache();
  });

  it('reports the Stripe test mode derived from the secret key', async () => {
    stripeMock.prices.retrieve.mockResolvedValue(stripePrice());
    const res = await request(app).get('/api/v1/config').expect(200);
    expect(res.body.data.features).toMatchObject({ payments: true, paymentsMode: 'test' });
  });

  it('serves the Pro price from Stripe', async () => {
    stripeMock.prices.retrieve.mockResolvedValue(stripePrice());

    const res = await request(app).get('/api/v1/config').expect(200);

    expect(stripeMock.prices.retrieve.mock.calls[0][0]).toBe('price_test_pro');
    expect(planById(res, 'pro')).toMatchObject({
      price: 19.99,
      currency: 'eur',
      interval: 'year',
      intervalCount: 1,
    });
    expect(planById(res, 'free')).toMatchObject({ price: 0, currency: 'eur', interval: 'year' });
  });

  it('falls back to the catalog price when Stripe fails', async () => {
    stripeMock.prices.retrieve.mockRejectedValue(new Error('Stripe is unavailable'));

    const res = await request(app).get('/api/v1/config').expect(200);

    expect(planById(res, 'pro')).toMatchObject({
      price: catalogPro.price,
      currency: catalogPro.currency,
      interval: catalogPro.interval,
    });
  });

  it('does not divide amounts in zero-decimal currencies', async () => {
    stripeMock.prices.retrieve.mockResolvedValue(stripePrice({ unit_amount: 1200, currency: 'jpy' }));
    const res = await request(app).get('/api/v1/config').expect(200);
    expect(planById(res, 'pro')).toMatchObject({ price: 1200, currency: 'jpy' });
  });

  it('falls back to the catalog price when the Stripe price is not recurring', async () => {
    stripeMock.prices.retrieve.mockResolvedValue(stripePrice({ recurring: null }));
    const res = await request(app).get('/api/v1/config').expect(200);
    expect(planById(res, 'pro').price).toBe(catalogPro.price);
  });

  it('caches the Stripe price between requests', async () => {
    stripeMock.prices.retrieve.mockResolvedValue(stripePrice({ unit_amount: 1500, currency: 'usd' }));

    const responses = await Promise.all([
      request(app).get('/api/v1/config').expect(200),
      request(app).get('/api/v1/config').expect(200),
    ]);
    const later = await request(app).get('/api/v1/config').expect(200);

    expect(stripeMock.prices.retrieve).toHaveBeenCalledTimes(1);
    for (const res of [...responses, later]) expect(planById(res, 'pro').price).toBe(15);
  });
});
