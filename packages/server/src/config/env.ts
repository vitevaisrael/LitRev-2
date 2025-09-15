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
  UNPAYWALL_EMAIL: z.string().email(),
  FEATURE_EXPLORER: z.preprocess((v) => v === 'true', z.boolean()).default(false),
  FEATURE_CHAT_REVIEW: z.preprocess((v) => v === 'true', z.boolean()).default(false),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development')
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error(
    'Invalid environment variables:',
    _env.error.flatten().fieldErrors
  );
  throw new Error('Invalid environment variables');
}

export const env = _env.data;
