import { config } from 'dotenv';
import { z } from 'zod';

config();

const EnvSchema = z.object({
  // Core
  NODE_ENV: z.enum(["development","test","production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("127.0.0.1"), // IPv4 explicit
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // Storage (unified naming)
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string(),
  
  // Features (proper booleans)
  FEATURE_EXPLORER: z.coerce.boolean().default(false),
  FEATURE_CHAT_REVIEW: z.coerce.boolean().default(false),
  
  // Security
  JWT_SECRET: z.string().min(32),
  COOKIE_SECRET: z.string().min(32),
  ALLOWED_ORIGINS: z.string().transform(s => s.split(',').map(o => o.trim())),
  
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

  // Security
  CLAMAV_ENABLED: z.preprocess((v) => v === 'true', z.boolean()).default(false),
  
  // Tier limits (fix the backwards logic)
  TIER_LIMITS: z.string().optional().transform(s => ({
    free: { size: 25*1024*1024, types: ['pdf'] },
    premium: { size: 50*1024*1024, types: ['pdf','doc','docx'] },
    pro: { size: 100*1024*1024, types: ['pdf','doc','docx','txt'] }
  }))
}).refine(data => data.JWT_SECRET !== data.COOKIE_SECRET, {
  message: "JWT and Cookie secrets must be different"
});

export const env = EnvSchema.parse(process.env); // Fail fast
