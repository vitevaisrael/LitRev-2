
import Fastify from 'fastify';
import { randomUUID } from 'crypto';
import { registerApp } from './app';
import { env } from './config/env';
import { startExplorerWorker } from './modules/explorer/worker';
import { startSearchWorker } from './jobs/searchQueue';
import { startPubMedWorker } from './modules/pubmed/search.queue';

const PORT = env.PORT;
const HOST = env.HOST ?? (env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');

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
  request.id = randomUUID();
  
  // Extract projectId and userId for logging
  const projectId = (request.params as any)?.projectId || (request.body as any)?.projectId;
  const userId = (request as any).user?.id;
  
  if (projectId || userId) {
    request.log.info({ projectId, userId }, 'Request context');
  }
});

// Rate limit headers (stub)
fastify.addHook('onSend', async (request, reply, payload) => {
  reply.header('X-RateLimit-Limit', '100');
  reply.header('X-RateLimit-Remaining', '100');
  reply.header('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + 60);
  return payload;
});

// Start server
const start = async () => {
  // Register all plugins and routes using the new auth v2 system
  await registerApp(fastify);
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
    
    try {
      if (env.ENABLE_PUBMED_WORKER) {
        startPubMedWorker();
        fastify.log.info('PubMed worker started');
      }
    } catch (e) {
      fastify.log.warn('PubMed worker not started (Redis unavailable)');
    }
    await fastify.listen({ host: HOST, port: PORT });
    console.log(`Server listening on ${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
