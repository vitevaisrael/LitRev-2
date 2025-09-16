import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { randomBytes, createHmac } from "crypto";
import { ENV } from "../config/auth";

interface CSRFState {
  token: string;
  timestamp: number;
}

// In-memory store for CSRF tokens (in production, use Redis)
const csrfTokens = new Map<string, CSRFState>();

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, state] of csrfTokens.entries()) {
    if (now - state.timestamp > 3600000) { // 1 hour expiry
      csrfTokens.delete(key);
    }
  }
}, 300000);

export async function registerCSRF(app: FastifyInstance) {
  // Generate CSRF token
  app.decorate("generateCSRFToken", (sessionId: string): string => {
    const token = randomBytes(32).toString('hex');
    const timestamp = Date.now();
    
    csrfTokens.set(sessionId, { token, timestamp });
    
    return token;
  });

  // Verify CSRF token
  app.decorate("verifyCSRFToken", (sessionId: string, token: string): boolean => {
    const state = csrfTokens.get(sessionId);
    if (!state) return false;
    
    // Check if token matches and is not expired
    const now = Date.now();
    if (state.token !== token || now - state.timestamp > 3600000) {
      csrfTokens.delete(sessionId);
      return false;
    }
    
    return true;
  });

  // CSRF middleware for non-GET requests
  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip CSRF for GET requests and auth endpoints
    if (request.method === 'GET' || 
        request.url.startsWith('/api/v1/auth-v2/') ||
        request.url.startsWith('/api/v1/health')) {
      return;
    }

    // Skip CSRF in development mode
    if (ENV.NODE_ENV === 'development') {
      return;
    }

    const sessionId = request.cookies?.[ENV.AUTH_COOKIE_NAME] || 'anonymous';
    const csrfToken = request.headers['x-csrf-token'] as string;

    if (!csrfToken) {
      return reply.code(403).send({ 
        ok: false, 
        error: 'CSRF_TOKEN_MISSING',
        message: 'CSRF token is required' 
      });
    }

    if (!app.verifyCSRFToken(sessionId, csrfToken)) {
      return reply.code(403).send({ 
        ok: false, 
        error: 'CSRF_TOKEN_INVALID',
        message: 'Invalid CSRF token' 
      });
    }
  });
}

declare module "fastify" {
  interface FastifyInstance {
    generateCSRFToken(sessionId: string): string;
    verifyCSRFToken(sessionId: string, token: string): boolean;
  }
}
