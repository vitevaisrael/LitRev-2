
import Fastify from 'fastify';
import { randomUUID } from 'crypto';
import { routes } from './routes';
import { env } from './config/env';
import { startExplorerWorker } from './modules/explorer/worker';
import { startSearchWorker } from './jobs/searchQueue';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';

const fastify = Fastify({
  logger: {
    level: 'info',
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        requestId: req.id
      })
    }
  }
});

// Register cookie support
fastify.register(fastifyCookie, {
  secret: env.JWT_SECRET,
  parseOptions: {}
});

// Register CORS support
fastify.register(fastifyCors, {
  origin: env.NODE_ENV === 'production' ? false : ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
});

// Register rate limiting
fastify.register(fastifyRateLimit, {
  global: true,
  max: 100, // requests per timeWindow
  timeWindow: '1 minute',
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true
  },
  ban: 0, // disable banning
  errorResponseBuilder: (request: any, context: any) => ({
    ok: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded, retry in ${Math.round(context.ttl / 1000)} seconds`,
      requestId: request.id
    }
  })
});

// Request ID and logging
fastify.addHook('onRequest', async (request, reply) => {
  request.id = randomUUID();
  
  // Extract projectId and userId for logging
  const projectId = (request.params as any)?.projectId || (request.body as any)?.projectId;
  const userId = (request as any).user?.id;
  
  if (projectId || userId) {
    request.log.info({ projectId, userId }, 'Request context');
  }
});

// Uniform response shape error handler
fastify.setErrorHandler(async (error, request, reply) => {
  request.log.error(error);
  
  reply.status(error.statusCode || 500).send({
    ok: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Internal server error',
      requestId: request.id
    }
  });
});

// Rate limit headers (stub)
fastify.addHook('onSend', async (request, reply, payload) => {
  reply.header('X-RateLimit-Limit', '100');
  reply.header('X-RateLimit-Remaining', '100');
  reply.header('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + 60);
  return payload;
});

// Register routes
fastify.register(routes, { prefix: '/api/v1' });

// Start server
const start = async () => {
  try {
    // Start background workers (Explorer, Search)
    try {
      startExplorerWorker();
      fastify.log.info('Explorer worker started');
    } catch (e) {
      fastify.log.warn('Explorer worker not started (Redis unavailable)');
    }
    
    try {
      startSearchWorker();
      fastify.log.info('Search worker started');
    } catch (e) {
      fastify.log.warn('Search worker not started (Redis unavailable)');
    }
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`Server listening on port ${env.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
