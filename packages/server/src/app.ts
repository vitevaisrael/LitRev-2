import type { FastifyInstance } from "fastify";
import { registerSecurity } from "./plugins/security";
import { registerErrors } from "./plugins/errors";
import { registerJwt } from "./auth/core";
import { registerLogging } from "./plugins/logging";
import authRoutes from "./routes/auth-v2";
import { routes } from "./routes";

export async function registerApp(app: FastifyInstance) {
  // Register plugins in correct order
  await registerSecurity(app);
  await registerErrors(app);
  await registerJwt(app);
  await registerLogging(app);

  // Public auth routes
  await app.register(authRoutes);

  // Register the rest of the routes
  await app.register(routes, { prefix: '/api/v1' });
}

