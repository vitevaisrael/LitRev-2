import { config } from 'dotenv';

config();

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  REDIS_URL: process.env.REDIS_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  S3_ENDPOINT: process.env.S3_ENDPOINT!,
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY!,
  S3_SECRET_KEY: process.env.S3_SECRET_KEY!,
  S3_BUCKET: process.env.S3_BUCKET!,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  OPENAI_TEMPERATURE: process.env.OPENAI_TEMPERATURE,
  UNPAYWALL_EMAIL: process.env.UNPAYWALL_EMAIL!,
  FEATURE_EXPLORER: process.env.FEATURE_EXPLORER === 'true',
  FEATURE_CHAT_REVIEW: process.env.FEATURE_CHAT_REVIEW === 'true',
  PORT: parseInt(process.env.PORT || '3000'),
  NODE_ENV: process.env.NODE_ENV || 'development'
};
