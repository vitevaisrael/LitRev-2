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
  FEATURE_PUBMED_SEARCH: z.coerce.boolean().default(false),
  FEATURE_PUBMED_IMPORT: z.coerce.boolean().default(false),
  FEATURE_PUBMED_EFETCH: z.coerce.boolean().default(false),
  ENABLE_PUBMED_WORKER: z.coerce.boolean().default(false),
  
  // Security
  JWT_SECRET: z.string().min(32),
  COOKIE_SECRET: z.string().min(32),
  ALLOWED_ORIGINS: z.string().transform(s => s.split(',').map(o => o.trim())),

  // Auth v2 Configuration
  APP_URL: z.string().url().default("http://localhost:5173"),
  AUTH_MODE: z.enum(["normal", "dev_bypass"]).default("normal"),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_TTL: z.coerce.number().default(900), // 15m
  JWT_REFRESH_TTL: z.coerce.number().default(1209600), // 14d
  AUTH_COOKIE_NAME: z.string().default("the_scientist_access"),
  AUTH_REFRESH_COOKIE_NAME: z.string().default("the_scientist_refresh"),
  AUTH_COOKIE_DOMAIN: z.string().default(""),
  AUTH_SECURE_COOKIES: z.coerce.boolean().default(false),
  AUTH_TRUST_PROXY: z.coerce.boolean().default(false),
  DEV_AUTO_LOGIN_EMAIL: z.string().email().default("dev@local"),
  DEV_AUTO_LOGIN_NAME: z.string().default("Dev User"),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),
  
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

  // PubMed configuration
  PUBMED_API_BASE: z.string().url().default("https://eutils.ncbi.nlm.nih.gov/entrez/eutils"),
  PUBMED_TOOL_NAME: z.string().default("litrev"),
  PUBMED_EMAIL: z.string().email().optional(),
  PUBMED_RATE_LIMIT_RPS: z.coerce.number().default(3),
  PUBMED_SUMMARY_CACHE_TTL_SEC: z.coerce.number().default(604800), // 7 days

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
