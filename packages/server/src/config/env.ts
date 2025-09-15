import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  // Core
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(1),
  COOKIE_SECRET: z.string().min(1).default('test-cookie-secret'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Optional services
  REDIS_URL: z.string().url().optional(),

  // LLM
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  OPENAI_TEMPERATURE: z.coerce.number().min(0).max(2).optional(),

  // Search pipeline
  UNPAYWALL_EMAIL: z.string().email(),
  PUBMED_API_KEY: z.string().optional(),
  MAX_RESULTS_PER_RUN: z.coerce.number().default(1000),
  SEARCH_QUEUE_CONCURRENCY: z.coerce.number().default(2),

  // Storage (S3-compatible)
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_REGION: z.string().min(1).optional(),
  S3_BUCKET: z.string().min(1).optional(),

  // Security
  CLAMAV_ENABLED: z.preprocess((v) => v === 'true', z.boolean()).default(false),

  // Back-compat (allow old key names if present)
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
}).transform((env) => {
  // Map legacy S3 key names if new ones are not provided
  return {
    ...env,
    S3_ACCESS_KEY_ID: env.S3_ACCESS_KEY_ID || env.S3_ACCESS_KEY,
    S3_SECRET_ACCESS_KEY: env.S3_SECRET_ACCESS_KEY || env.S3_SECRET_KEY,
  } as any;
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}
export const env = parsed.data as z.infer<typeof envSchema>;
