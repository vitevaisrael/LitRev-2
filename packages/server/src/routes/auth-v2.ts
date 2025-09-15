import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { ENV } from "../config/auth";
import { findUserByEmail, verifyPassword } from "../db/user.repo";
import { prisma } from "../lib/prisma";

export default async function authRoutes(app: FastifyInstance) {
  await app.register(rateLimit, { max: 30, timeWindow: "1 minute" });

  // Public: expose mode to UI (safe)
  app.get("/api/v1/auth/config", async (_req, reply) => {
    return reply.send({ ok: true, mode: ENV.AUTH_MODE });
  });

  // Single source of truth for UI auth state
  app.get("/api/v1/me", async (req, reply) => {
    try {
      const token = req.cookies?.[ENV.AUTH_COOKIE_NAME];
      if (!token) return reply.code(401).send({ ok: false, error: "UNAUTHENTICATED" });
      const payload = await app.jwt.verify(token, { secret: ENV.JWT_ACCESS_SECRET as any });
      return reply.send({ ok: true, user: payload });
    } catch {
      return reply.code(401).send({ ok: false, error: "UNAUTHENTICATED" });
    }
  });

  // Login
  const LoginZ = z.object({ email: z.string().email(), password: z.string().min(1) });
  app.post("/api/v1/auth/login", async (req, reply) => {
    if (ENV.AUTH_MODE === "dev_bypass") {
      const user = { 
        id: "00000000-0000-0000-0000-000000000001", 
        email: ENV.DEV_AUTO_LOGIN_EMAIL, 
        name: ENV.DEV_AUTO_LOGIN_NAME 
      };
      const access = app.signAccess(user);
      const refresh = app.signRefresh(user);
      app.setAuthCookies(reply, access, refresh);
      return reply.send({ ok: true, user });
    }
    
    const body = LoginZ.parse(req.body ?? {});
    const row = await findUserByEmail(body.email);
    if (!row) return reply.code(401).send({ ok: false, error: "INVALID_CREDENTIALS" });
    const ok = await verifyPassword(row.passwordHash, body.password);
    if (!ok) return reply.code(401).send({ ok: false, error: "INVALID_CREDENTIALS" });
    
    const user = { id: row.id, email: row.email, name: row.name };
    const access = app.signAccess(user);
    const refresh = app.signRefresh(user);
    app.setAuthCookies(reply, access, refresh);
    
    // Create audit log
    try {
      await prisma.auditLog.create({
        data: {
          projectId: 'system',
          userId: user.id,
          action: 'user_logged_in',
          details: { email: user.email, mode: ENV.AUTH_MODE }
        }
      });
    } catch (auditError) {
      // Log the error but don't fail the login
      console.error('Failed to create audit log:', auditError);
    }
    
    return reply.send({ ok: true, user });
  });

  // Refresh → rotate BOTH tokens
  app.post("/api/v1/auth/refresh", async (req, reply) => {
    try {
      const rt = req.cookies?.[ENV.AUTH_REFRESH_COOKIE_NAME];
      if (!rt) return reply.code(401).send({ ok: false, error: "UNAUTHENTICATED" });
      const payload = await app.jwt.verify(rt, { secret: ENV.JWT_REFRESH_SECRET as any });
      const user = payload as any;
      const access = app.signAccess(user);
      const refresh = app.signRefresh(user);
      app.setAuthCookies(reply, access, refresh);
      return reply.send({ ok: true });
    } catch {
      return reply.code(401).send({ ok: false, error: "UNAUTHENTICATED" });
    }
  });

  app.post("/api/v1/auth/logout", async (_req, reply) => {
    app.clearAuthCookies(reply);
    return reply.send({ ok: true });
  });
}

