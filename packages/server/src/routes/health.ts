import { FastifyInstance } from 'fastify';
import { sendSuccess } from '../utils/response';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (request, reply) => {
    return sendSuccess(reply, { 
      status: 'healthy', 
      timestamp: new Date().toISOString() 
    });
  });
}
