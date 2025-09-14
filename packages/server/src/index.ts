import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { routes } from './routes';
import { env } from './config/env';

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

// Request ID and logging
fastify.addHook('onRequest', async (request, reply) => {
  request.id = crypto.randomUUID();
  
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

// Health endpoint
fastify.get('/api/v1/health', async (request, reply) => {
  return { ok: true, data: { status: 'healthy', timestamp: new Date().toISOString() } };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`Server listening on port ${env.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
