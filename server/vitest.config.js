import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./tests/globalSetup.js'],
    setupFiles: ['./tests/setup.js'],
    testTimeout: 20_000,
    hookTimeout: 120_000,
    env: {
      NODE_ENV: 'test',
      JWT_ACCESS_SECRET: 'test-access-secret-that-is-long-enough-1234567890',
      CLIENT_URL: 'http://localhost:5173',
      RATE_LIMIT_ENABLED: 'false',
      STRIPE_SECRET_KEY: 'sk_test_nichelink_dummy',
      STRIPE_WEBHOOK_SECRET: 'whsec_nichelink_test_secret',
      STRIPE_PRO_PRICE_ID: 'price_test_pro',
      CLOUDINARY_CLOUD_NAME: 'nichelink-test',
      CLOUDINARY_API_KEY: 'test-key',
      CLOUDINARY_API_SECRET: 'test-secret',
    },
  },
});
