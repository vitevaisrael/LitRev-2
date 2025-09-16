import { getRedis } from '../lib/redis';
import { sendError } from './response';
import type { FastifyRequest, FastifyReply } from 'fastify';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: FastifyRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (req) => `${req.ip}`,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'Too many requests, please try again later.',
      ...config
    };
  }

  async checkLimit(req: FastifyRequest): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    totalHits: number;
  }> {
    const key = this.config.keyGenerator!(req);
    const window = Math.floor(Date.now() / this.config.windowMs);
    const redisKey = `rate_limit:${key}:${window}`;
    
    try {
      const redis = getRedis();
      
      // Increment counter
      const totalHits = await redis.incr(redisKey);
      
      // Set expiration if this is the first request in the window
      if (totalHits === 1) {
        await redis.expire(redisKey, Math.ceil(this.config.windowMs / 1000));
      }
      
      const remaining = Math.max(0, this.config.maxRequests - totalHits);
      const resetTime = (window + 1) * this.config.windowMs;
      
      return {
        allowed: totalHits <= this.config.maxRequests,
        remaining,
        resetTime,
        totalHits
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // If Redis is down, allow the request
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs,
        totalHits: 0
      };
    }
  }

  async middleware(req: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const result = await this.checkLimit(req);
    
    // Set rate limit headers
    reply.header('X-RateLimit-Limit', this.config.maxRequests);
    reply.header('X-RateLimit-Remaining', result.remaining);
    reply.header('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
    
    if (!result.allowed) {
      reply.header('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000));
      sendError(reply, 'RATE_LIMIT_EXCEEDED', this.config.message!, 429);
      return false;
    }
    
    return true;
  }
}

// Predefined rate limiters
export const authRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  keyGenerator: (req) => `auth:${req.ip}`,
  message: 'Too many authentication attempts, please try again later.'
});

export const apiRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  keyGenerator: (req) => `api:${req.ip}`,
  message: 'Too many API requests, please try again later.'
});

export const uploadRateLimit = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 uploads per hour
  keyGenerator: (req) => `upload:${(req as any).user?.id || req.ip}`,
  message: 'Too many file uploads, please try again later.'
});

export const searchRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 searches per minute
  keyGenerator: (req) => `search:${(req as any).user?.id || req.ip}`,
  message: 'Too many search requests, please try again later.'
});

// User-specific rate limiter
export function createUserRateLimit(config: Omit<RateLimitConfig, 'keyGenerator'>) {
  return new RateLimiter({
    ...config,
    keyGenerator: (req) => `user:${(req as any).user?.id || req.ip}`
  });
}

// IP-based rate limiter
export function createIPRateLimit(config: Omit<RateLimitConfig, 'keyGenerator'>) {
  return new RateLimiter({
    ...config,
    keyGenerator: (req) => `ip:${req.ip}`
  });
}

// Fastify plugin for rate limiting
export async function registerRateLimit(fastify: any, options: {
  global?: boolean;
  rateLimiters?: RateLimiter[];
}) {
  const { global = false, rateLimiters = [apiRateLimit] } = options;
  
  if (global) {
    fastify.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
      for (const limiter of rateLimiters) {
        const allowed = await limiter.middleware(req, reply);
        if (!allowed) return;
      }
    });
  }
}
