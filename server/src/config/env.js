import { z } from 'zod';

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),

  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/nichelink'),

  CLIENT_URL: z.url().default('http://localhost:5173'),
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
});

function loadEnv(source) {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  const values = result.data;
  const isProduction = values.NODE_ENV === 'production';

  if (values.COOKIE_SAMESITE === 'none' && values.COOKIE_SECURE === false) {
    throw new Error('Invalid environment configuration: COOKIE_SAMESITE=none requires COOKIE_SECURE=true');
  }

  const corsOrigins = [
    values.CLIENT_URL,
    ...(values.CORS_ORIGINS ? values.CORS_ORIGINS.split(',').map((origin) => origin.trim()) : []),
  ].filter(Boolean);

  return Object.freeze({
    ...values,
    isProduction,
    isTest: values.NODE_ENV === 'test',
    isDevelopment: values.NODE_ENV === 'development',
    corsOrigins: [...new Set(corsOrigins)],
    cookieSecure: values.COOKIE_SECURE ?? isProduction,
    features: Object.freeze({
      payments: Boolean(
        values.STRIPE_SECRET_KEY && values.STRIPE_WEBHOOK_SECRET && values.STRIPE_PRO_PRICE_ID,
      ),
      uploads: Boolean(
        values.CLOUDINARY_CLOUD_NAME && values.CLOUDINARY_API_KEY && values.CLOUDINARY_API_SECRET,
      ),
    }),
  });
}

export const env = loadEnv(process.env);
