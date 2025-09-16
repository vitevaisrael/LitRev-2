import { randomUUID } from "node:crypto";
import { env } from "./env";

// Validate JWT secrets are properly configured
if (!env.JWT_ACCESS_SECRET && !env.JWT_SECRET) {
  throw new Error('JWT_ACCESS_SECRET or JWT_SECRET must be provided');
}

if (!env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET must be provided');
}

// Ensure secrets are different
if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
}

export const ENV = {
  NODE_ENV: env.NODE_ENV,
  APP_URL: env.APP_URL,

  AUTH_MODE: env.AUTH_MODE,
  JWT_ACCESS_SECRET: env.JWT_ACCESS_SECRET || env.JWT_SECRET,
  JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET,
  JWT_ACCESS_TTL: env.JWT_ACCESS_TTL,
  JWT_REFRESH_TTL: env.JWT_REFRESH_TTL,

  AUTH_COOKIE_NAME: env.AUTH_COOKIE_NAME,
  AUTH_REFRESH_COOKIE_NAME: env.AUTH_REFRESH_COOKIE_NAME,
  AUTH_COOKIE_DOMAIN: env.AUTH_COOKIE_DOMAIN,
  AUTH_SECURE_COOKIES: env.AUTH_SECURE_COOKIES,
  AUTH_TRUST_PROXY: env.AUTH_TRUST_PROXY,

  CORS_ORIGIN: env.CORS_ORIGIN,
  CORS_CREDENTIALS: env.CORS_CREDENTIALS,

  // Dev bypass configuration
  DEV_AUTO_LOGIN_EMAIL: env.DEV_AUTO_LOGIN_EMAIL,
  DEV_AUTO_LOGIN_NAME: env.DEV_AUTO_LOGIN_NAME
};

export const FEATURE = {
  AUTH_ENABLED: true,            // Keep auth surface even with dev_bypass
  OWNERSHIP_ENFORCED: true
};

