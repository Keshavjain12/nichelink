import { z } from 'zod';

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

/** Local defaults for development and test only; production must configure these explicitly. */
const NON_PRODUCTION_DEFAULTS = Object.freeze({
  MONGODB_URI: 'mongodb://127.0.0.1:27017/nichelink',
  CLIENT_URL: 'http://localhost:5173',
});

const STRIPE_KEY_MODE_PATTERN = /^(?:sk|rk)_(test|live)_/;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),

  MONGODB_URI: optionalString,

  // Blank counts as unset so production reports it as missing rather than as an invalid URL.
  CLIENT_URL: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.url().optional(),
  ),
  CORS_ORIGINS: optionalString,
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  JWT_ACCESS_SECRET: z
    .string({ error: 'JWT_ACCESS_SECRET is required' })
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_SECURE: z.stringbool().optional(),

  RATE_LIMIT_ENABLED: z.stringbool().default(true),

  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,

  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  STRIPE_PRO_PRICE_ID: optionalString,

  SEED_DEMO_PASSWORD: optionalString,
  ALLOW_PRODUCTION_SEED: z.stringbool().default(false),
});

export function loadEnv(source) {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  const isProduction = result.data.NODE_ENV === 'production';
  const missing = Object.keys(NON_PRODUCTION_DEFAULTS).filter((key) => !result.data[key]);
  if (isProduction && missing.length > 0) {
    throw new Error(
      `Invalid environment configuration: ${missing.join(', ')} must be set when NODE_ENV=production`,
    );
  }

  const values = {
    ...result.data,
    MONGODB_URI: result.data.MONGODB_URI ?? NON_PRODUCTION_DEFAULTS.MONGODB_URI,
    CLIENT_URL: result.data.CLIENT_URL ?? NON_PRODUCTION_DEFAULTS.CLIENT_URL,
  };

  if (values.COOKIE_SAMESITE === 'none' && values.COOKIE_SECURE === false) {
    throw new Error(
      'Invalid environment configuration: COOKIE_SAMESITE=none requires COOKIE_SECURE=true',
    );
  }

  const corsOrigins = [
    values.CLIENT_URL,
    ...(values.CORS_ORIGINS ? values.CORS_ORIGINS.split(',').map((origin) => origin.trim()) : []),
  ].filter(Boolean);

  const payments = Boolean(
    values.STRIPE_SECRET_KEY && values.STRIPE_WEBHOOK_SECRET && values.STRIPE_PRO_PRICE_ID,
  );
  const paymentsMode = payments
    ? (values.STRIPE_SECRET_KEY.match(STRIPE_KEY_MODE_PATTERN)?.[1] ?? null)
    : null;

  return Object.freeze({
    ...values,
    isProduction,
    isTest: values.NODE_ENV === 'test',
    isDevelopment: values.NODE_ENV === 'development',
    corsOrigins: [...new Set(corsOrigins)],
    cookieSecure: values.COOKIE_SECURE ?? isProduction,
    features: Object.freeze({
      payments,
      paymentsMode,
      uploads: Boolean(
        values.CLOUDINARY_CLOUD_NAME && values.CLOUDINARY_API_KEY && values.CLOUDINARY_API_SECRET,
      ),
    }),
  });
}

export const env = loadEnv(process.env);
