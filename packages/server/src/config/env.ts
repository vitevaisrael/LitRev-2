import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(1),
  COOKIE_SECRET: z.string().min(1),
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  OPENAI_TEMPERATURE: z.coerce.number().min(0).max(2).optional(),
  UNPAYWALL_EMAIL: z.string().email(),
  FEATURE_EXPLORER: z.preprocess((v) => v === 'true', z.boolean()).default(false),
  FEATURE_CHAT_REVIEW: z.preprocess((v) => v === 'true', z.boolean()).default(false),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  
  // Search pipeline
  PUBMED_API_KEY: z.string().optional(),
  MAX_RESULTS_PER_RUN: z.coerce.number().default(1000),
  SEARCH_QUEUE_CONCURRENCY: z.coerce.number().default(2),
  
  // Security & Storage
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_REGION: z.string().min(1).optional(),
  S3_BUCKET: z.string().min(1).optional(),
  CLAMAV_ENABLED: z.preprocess((v) => v === 'true', z.boolean()).default(false),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}
export const env = parsed.data;

