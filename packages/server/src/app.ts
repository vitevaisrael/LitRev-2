import type { FastifyInstance } from "fastify";
import { registerSecurity } from "./plugins/security";
import { registerErrors } from "./plugins/errors";
import { registerJwt } from "./auth/core";
import { registerLogging } from "./plugins/logging";
import authRoutes from "./routes/auth-v2";
import { routes } from "./routes";
import homeRoutes from "./routes/home";
import aiRoutes from "./routes/ai";

export async function registerApp(app: FastifyInstance) {
  const FEATURE_HOME_ENDPOINTS = process.env.FEATURE_HOME_ENDPOINTS === '1';
  const FEATURE_HOME_AI_ENDPOINTS = process.env.FEATURE_HOME_AI_ENDPOINTS === '1';

  // Register plugins in correct order
  await registerSecurity(app);
  await registerErrors(app);
  await registerJwt(app);
  await registerLogging(app);

  // Public auth routes
  await app.register(authRoutes);

  // AI endpoints (behind feature flag)
  if (FEATURE_HOME_AI_ENDPOINTS) {
    await app.register(aiRoutes);
  }

  // Home endpoints (behind feature flag)
  if (FEATURE_HOME_ENDPOINTS) {
    await app.register(homeRoutes);
  }

  // Register the rest of the routes
  await app.register(routes, { prefix: '/api/v1' });
}

