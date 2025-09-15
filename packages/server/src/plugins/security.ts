import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import type { FastifyInstance } from "fastify";
import { ENV } from "../config/auth";

export async function registerSecurity(app: FastifyInstance) {
  if (ENV.AUTH_TRUST_PROXY) app.setTrustProxy(true);

  await app.register(cors, {
    origin: ENV.CORS_ORIGIN,
    credentials: ENV.CORS_CREDENTIALS,
    methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allowedHeaders: ["Content-Type","Authorization","X-Requested-With"]
  });

  await app.register(helmet, { contentSecurityPolicy: false }); // tighten later

  await app.register(cookie, { parseOptions: {} });

  // CSRF TODO (production hardening):
  // When exposing publicly, add CSRF protection for non-GET routes
  // (e.g., fastify-csrf-protection) and enforce per-request tokens.
}

