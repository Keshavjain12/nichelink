import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env.js';

const SECRET = 'test-access-secret-that-is-long-enough-1234567890';
const PRODUCTION = Object.freeze({
  NODE_ENV: 'production',
  JWT_ACCESS_SECRET: SECRET,
  MONGODB_URI: 'mongodb://db.internal:27017/nichelink',
  CLIENT_URL: 'https://nichelink.example.com',
});
const STRIPE = Object.freeze({ STRIPE_WEBHOOK_SECRET: 'whsec_test', STRIPE_PRO_PRICE_ID: 'price_test_pro' });

describe('environment configuration', () => {
  it('accepts a complete production configuration', () => {
    const env = loadEnv(PRODUCTION);
    expect(env).toMatchObject({ MONGODB_URI: PRODUCTION.MONGODB_URI, CLIENT_URL: PRODUCTION.CLIENT_URL });
    expect(env.isProduction).toBe(true);
  });

  it.each(['MONGODB_URI', 'CLIENT_URL'])('fails fast in production when %s is missing', (key) => {
    const source = { ...PRODUCTION, [key]: undefined };
    expect(() => loadEnv(source)).toThrow(`${key} must be set when NODE_ENV=production`);
  });

  it('treats a blank MONGODB_URI as missing in production', () => {
    expect(() => loadEnv({ ...PRODUCTION, MONGODB_URI: '  ' })).toThrow('MONGODB_URI must be set');
  });

  it.each(['', '   '])('treats a blank CLIENT_URL (%j) as missing in production', (value) => {
    expect(() => loadEnv({ ...PRODUCTION, CLIENT_URL: value })).toThrow('CLIENT_URL must be set when NODE_ENV=production');
  });

  it('rejects a non-empty CLIENT_URL that is not a URL', () => {
    expect(() => loadEnv({ ...PRODUCTION, CLIENT_URL: 'not a url' })).toThrow(/CLIENT_URL: Invalid URL/);
  });

  it('uses the development CLIENT_URL default when it is blank', () => {
    expect(loadEnv({ NODE_ENV: 'development', JWT_ACCESS_SECRET: SECRET, CLIENT_URL: '' }).CLIENT_URL).toBe(
      'http://localhost:5173',
    );
  });

  it.each(['development', 'test'])('keeps local defaults in %s', (nodeEnv) => {
    const env = loadEnv({ NODE_ENV: nodeEnv, JWT_ACCESS_SECRET: SECRET });
    expect(env.MONGODB_URI).toBe('mongodb://127.0.0.1:27017/nichelink');
    expect(env.CLIENT_URL).toBe('http://localhost:5173');
    expect(env.corsOrigins).toEqual(['http://localhost:5173']);
  });

  it('parses ALLOW_PRODUCTION_SEED as a boolean defaulting to false', () => {
    expect(loadEnv(PRODUCTION).ALLOW_PRODUCTION_SEED).toBe(false);
    expect(loadEnv({ ...PRODUCTION, ALLOW_PRODUCTION_SEED: 'true' }).ALLOW_PRODUCTION_SEED).toBe(true);
  });

  it.each([
    ['sk_test_abc', 'test'],
    ['rk_test_abc', 'test'],
    ['sk_live_abc', 'live'],
    ['not_a_stripe_key', null],
  ])('derives paymentsMode from STRIPE_SECRET_KEY %s', (key, mode) => {
    const env = loadEnv({ ...PRODUCTION, ...STRIPE, STRIPE_SECRET_KEY: key });
    expect(env.features.paymentsMode).toBe(mode);
  });

  it('reports no paymentsMode when payments are not configured', () => {
    const env = loadEnv({ ...PRODUCTION, STRIPE_SECRET_KEY: 'sk_live_abc' });
    expect(env.features).toMatchObject({ payments: false, paymentsMode: null });
  });
});
