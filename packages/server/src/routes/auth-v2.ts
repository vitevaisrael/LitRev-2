import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { ENV } from "../config/auth";
import { findUserByEmail, verifyPassword, createUser } from "../db/user.repo";
import { prisma } from "../lib/prisma";
import { sendSuccess, sendError } from "../utils/response";
import { auditLog } from "../utils/audit";

export default async function authRoutes(app: FastifyInstance) {
  await app.register(rateLimit, { max: 30, timeWindow: "1 minute" });

  // Public: expose mode to UI (safe)
  app.get("/api/v1/auth-v2/config", async (_req, reply) => {
    return reply.send({ ok: true, mode: ENV.AUTH_MODE });
  });

  // Single source of truth for UI auth state
  app.get("/api/v1/auth-v2/me", async (req, reply) => {
    try {
      const token = req.cookies?.[ENV.AUTH_COOKIE_NAME];
      if (!token) return reply.code(401).send({ ok: false, error: "UNAUTHENTICATED" });
      const payload = await app.jwt.verify(token);
      return sendSuccess(reply, { user: payload });
    } catch {
      return reply.code(401).send({ ok: false, error: "UNAUTHENTICATED" });
    }
  });

  // Enhanced password validation schema
  const PasswordSchema = z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

  // Login
  const LoginZ = z.object({ 
    email: z.string().email("Invalid email format"), 
    password: z.string().min(1, "Password is required") 
  });
  app.post("/api/v1/auth-v2/login", async (req, reply) => {
    try {
      if (ENV.AUTH_MODE === "dev_bypass") {
        const user = { 
          id: "00000000-0000-0000-0000-000000000001", 
          email: ENV.DEV_AUTO_LOGIN_EMAIL, 
          name: ENV.DEV_AUTO_LOGIN_NAME 
        };
        const access = app.signAccess(user);
        const refresh = app.signRefresh(user);
        app.setAuthCookies(reply, access, refresh);
        
        // Audit log for dev bypass
        await auditLog('system', user.id, 'user_logged_in_dev', { 
          email: user.email, 
          mode: ENV.AUTH_MODE,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
        
        return sendSuccess(reply, { user });
      }
      
      const body = LoginZ.parse(req.body ?? {});
      const row = await findUserByEmail(body.email);
      if (!row) {
        // Log failed login attempt
        await auditLog('system', 'anonymous', 'login_failed', { 
          email: body.email, 
          reason: 'user_not_found',
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
        return sendError(reply, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
      }
      
      const ok = await verifyPassword(row.passwordHash, body.password);
      if (!ok) {
        // Log failed login attempt
        await auditLog('system', row.id, 'login_failed', { 
          email: body.email, 
          reason: 'invalid_password',
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
        return sendError(reply, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
      }
      
      const user = { id: row.id, email: row.email, name: row.name };
      const access = app.signAccess({ ...user, name: user.name || undefined });
      const refresh = app.signRefresh({ ...user, name: user.name || undefined });
      app.setAuthCookies(reply, access, refresh);
      
      // Create audit log for successful login
      await auditLog('system', user.id, 'user_logged_in', { 
        email: user.email, 
        mode: ENV.AUTH_MODE,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      return sendSuccess(reply, { user });
    } catch (error) {
      console.error('Login error:', error);
      return sendError(reply, 'LOGIN_ERROR', 'An error occurred during login', 500);
    }
  });

  // Register
  const RegisterZ = z.object({ 
    email: z.string().email("Invalid email format"), 
    password: PasswordSchema,
    name: z.string().min(1, "Name is required").max(100, "Name too long").optional() 
  });
  app.post("/api/v1/auth-v2/register", async (req, reply) => {
    try {
      const body = RegisterZ.parse(req.body ?? {});
      const existing = await findUserByEmail(body.email);
      if (existing) {
        await auditLog('system', 'anonymous', 'registration_failed', { 
          email: body.email, 
          reason: 'user_exists',
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
        return sendError(reply, 'USER_EXISTS', 'User with this email already exists', 409);
      }
      
      const user = await createUser(body.email, body.password, body.name);
      
      const access = app.signAccess({ ...user, name: user.name || undefined });
      const refresh = app.signRefresh({ ...user, name: user.name || undefined });
      app.setAuthCookies(reply, access, refresh);
      
      // Create audit log for successful registration
      await auditLog('system', user.id, 'user_registered', { 
        email: user.email, 
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      return sendSuccess(reply, { user }, 201);
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof z.ZodError) {
        return sendError(reply, 'VALIDATION_ERROR', error.errors[0].message, 422);
      }
      return sendError(reply, 'REGISTRATION_ERROR', 'An error occurred during registration', 500);
    }
  });

  // Refresh → rotate BOTH tokens
  app.post("/api/v1/auth-v2/refresh", async (req, reply) => {
    try {
      const rt = req.cookies?.[ENV.AUTH_REFRESH_COOKIE_NAME];
      if (!rt) {
        return sendError(reply, 'UNAUTHENTICATED', 'No refresh token provided', 401);
      }
      
      const payload = await app.jwt.verify(rt);
      const user = payload as any;
      
      // Verify user still exists
      const existingUser = await findUserByEmail(user.email);
      if (!existingUser) {
        return sendError(reply, 'USER_NOT_FOUND', 'User no longer exists', 401);
      }
      
      const access = app.signAccess(user);
      const refresh = app.signRefresh(user);
      app.setAuthCookies(reply, access, refresh);
      
      // Log token refresh
      await auditLog('system', user.id, 'token_refreshed', { 
        email: user.email,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      return sendSuccess(reply, { message: 'Tokens refreshed successfully' });
    } catch (error) {
      console.error('Token refresh error:', error);
      return sendError(reply, 'UNAUTHENTICATED', 'Invalid refresh token', 401);
    }
  });

  app.post("/api/v1/auth-v2/logout", async (req, reply) => {
    try {
      // Get user info before clearing cookies for audit log
      const token = req.cookies?.[ENV.AUTH_COOKIE_NAME];
      let userId = 'anonymous';
      let email = 'unknown';
      
      if (token) {
        try {
          const payload = await app.jwt.verify(token);
          userId = (payload as any).id;
          email = (payload as any).email;
        } catch {
          // Token invalid, continue with logout
        }
      }
      
      app.clearAuthCookies(reply);
      
      // Log logout
      await auditLog('system', userId, 'user_logged_out', { 
        email,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      return sendSuccess(reply, { message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear cookies even if logging fails
      app.clearAuthCookies(reply);
      return sendSuccess(reply, { message: 'Logout successful' });
    }
  });
}

