import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authRateLimit, apiRateLimit, uploadRateLimit, searchRateLimit } from '../utils/rateLimit';
import { auditLog } from '../utils/audit';
import { sanitizeString, sanitizeObject } from '../utils/validation';

export interface SecurityConfig {
  enableRateLimit?: boolean;
  enableAuditLog?: boolean;
  enableInputSanitization?: boolean;
  enableSecurityHeaders?: boolean;
}

export async function registerSecurityMiddleware(
  app: FastifyInstance,
  config: SecurityConfig = {}
) {
  const {
    enableRateLimit = true,
    enableAuditLog = true,
    enableInputSanitization = true,
    enableSecurityHeaders = true
  } = config;

  // Security headers middleware
  if (enableSecurityHeaders) {
    app.addHook('onSend', async (request, reply, payload) => {
      // Add security headers
      reply.header('X-Content-Type-Options', 'nosniff');
      reply.header('X-Frame-Options', 'DENY');
      reply.header('X-XSS-Protection', '1; mode=block');
      reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
      reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      
      // Add request ID for tracing
      const requestId = (request as any).id || 'unknown';
      reply.header('X-Request-ID', requestId);
      
      return payload;
    });
  }

  // Input sanitization middleware
  if (enableInputSanitization) {
    app.addHook('preHandler', async (request, reply) => {
      // Sanitize request body
      if (request.body && typeof request.body === 'object') {
        request.body = sanitizeObject(request.body as any);
      }
      
      // Sanitize query parameters
      if (request.query && typeof request.query === 'object') {
        request.query = sanitizeObject(request.query as any);
      }
      
      // Sanitize URL parameters
      if (request.params && typeof request.params === 'object') {
        request.params = sanitizeObject(request.params as any);
      }
    });
  }

  // Rate limiting middleware
  if (enableRateLimit) {
    app.addHook('preHandler', async (request, reply) => {
      const url = request.url;
      const method = request.method;
      
      // Apply different rate limits based on endpoint
      if (url.startsWith('/api/v1/auth-v2/')) {
        const allowed = await authRateLimit.middleware(request, reply);
        if (!allowed) return;
      } else if (url.includes('/upload') || url.includes('/pdf')) {
        const allowed = await uploadRateLimit.middleware(request, reply);
        if (!allowed) return;
      } else if (url.includes('/search') || url.includes('/pubmed')) {
        const allowed = await searchRateLimit.middleware(request, reply);
        if (!allowed) return;
      } else if (url.startsWith('/api/v1/')) {
        const allowed = await apiRateLimit.middleware(request, reply);
        if (!allowed) return;
      }
    });
  }

  // Audit logging middleware
  if (enableAuditLog) {
    app.addHook('onRequest', async (request, reply) => {
      const startTime = Date.now();
      (request as any).startTime = startTime;
    });

    app.addHook('onResponse', async (request, reply) => {
      const endTime = Date.now();
      const duration = endTime - ((request as any).startTime || endTime);
      const userId = (request as any).user?.id || 'anonymous';
      
      // Log all requests (except health checks)
      if (!request.url.startsWith('/health')) {
        await auditLog('system', userId, 'api_request', {
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          duration,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          requestId: (request as any).id
        });
      }
    });
  }

  // Request size limiting
  app.addHook('preHandler', async (request, reply) => {
    const contentLength = request.headers['content-length'];
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (size > maxSize) {
        return reply.status(413).send({
          ok: false,
          error: 'PAYLOAD_TOO_LARGE',
          message: 'Request payload too large'
        });
      }
    }
  });

  // Request timeout middleware
  app.addHook('preHandler', async (request, reply) => {
    const timeout = setTimeout(() => {
      if (!reply.sent) {
        reply.status(408).send({
          ok: false,
          error: 'REQUEST_TIMEOUT',
          message: 'Request timeout'
        });
      }
    }, 30000); // 30 second timeout
    
    (request as any).timeout = timeout;
  });

  app.addHook('onResponse', async (request, reply) => {
    const timeout = (request as any).timeout;
    if (timeout) {
      clearTimeout(timeout);
    }
  });
}

// Security middleware for specific routes
export function createSecureRoute(config: {
  requireAuth?: boolean;
  requireProjectAccess?: boolean;
  requireAdmin?: boolean;
  rateLimit?: 'auth' | 'api' | 'upload' | 'search' | 'none';
  auditAction?: string;
}) {
  const {
    requireAuth = true,
    requireProjectAccess = false,
    requireAdmin = false,
    rateLimit = 'api',
    auditAction
  } = config;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Apply rate limiting
    if (rateLimit !== 'none') {
      let limiter;
      switch (rateLimit) {
        case 'auth':
          limiter = authRateLimit;
          break;
        case 'upload':
          limiter = uploadRateLimit;
          break;
        case 'search':
          limiter = searchRateLimit;
          break;
        default:
          limiter = apiRateLimit;
      }
      
      const allowed = await limiter.middleware(request, reply);
      if (!allowed) return;
    }

    // Apply authentication
    if (requireAuth) {
      const { requireAuth: authMiddleware } = await import('../auth/middleware');
      const result = await authMiddleware(request, reply);
      if (result) return result; // Error response sent
    }

    // Apply project access check
    if (requireProjectAccess) {
      const { requireProjectAccess: projectMiddleware } = await import('../auth/middleware');
      const result = await projectMiddleware(request, reply);
      if (result) return result; // Error response sent
    }

    // Apply admin check
    if (requireAdmin) {
      const { requireAdmin: adminMiddleware } = await import('../auth/middleware');
      const result = await adminMiddleware(request, reply);
      if (result) return result; // Error response sent
    }

    // Log audit action
    if (auditAction) {
      const userId = (request as any).user?.id || 'anonymous';
      await auditLog('system', userId, auditAction, {
        method: request.method,
        url: request.url,
        ip: request.ip,
        userAgent: request.headers['user-agent']
      });
    }
  };
}
