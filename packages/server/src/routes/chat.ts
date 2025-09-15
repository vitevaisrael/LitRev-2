import { FastifyInstance } from 'fastify';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../auth/middleware';
import { 
  StartChatSchema, 
  SendMessageSchema, 
  ChatSessionSchema,
  ChatMessageSchema 
} from '@the-scientist/schemas';
import { z } from 'zod';
import { ReviewChatService } from '../modules/chat/reviewChatService';
import { env } from '../config/env';

export async function chatRoutes(fastify: FastifyInstance) {
  const chatService = new ReviewChatService();

  // POST /api/v1/chat/sessions
  fastify.post('/chat/sessions', {
    preHandler: [requireAuth, async (request, reply) => {
      if (!env.FEATURE_CHAT_REVIEW) {
        return sendError(reply, 'FEATURE_DISABLED', 'Chat review feature is not enabled', 403);
      }
      
      try {
        request.body = StartChatSchema.parse(request.body);
      } catch (error) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid request body', 422);
      }
    }]
  }, async (request, reply) => {
    try {
      const { topic, findings } = request.body as { topic: string; findings?: string };
      
      const sessionId = await chatService.startSession(topic, findings);
      
      return sendSuccess(reply, { sessionId }, 201);
    } catch (error) {
      return sendError(reply, 'CHAT_ERROR', 'Failed to start chat session', 500);
    }
  });

  // GET /api/v1/chat/sessions/:id
  fastify.get('/chat/sessions/:id', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      const session = await prisma.chatSession.findUnique({
        where: { id },
        include: { 
          messages: { 
            orderBy: { createdAt: 'asc' } 
          } 
        }
      });

      if (!session) {
        return sendError(reply, 'NOT_FOUND', 'Chat session not found', 404);
      }

      // Check job status if running
      if (session.status === 'running') {
        const jobStatus = await chatService.checkJobStatus(id);
        // Job status check updates the session, so refetch
        const updatedSession = await prisma.chatSession.findUnique({
          where: { id },
          include: { 
            messages: { 
              orderBy: { createdAt: 'asc' } 
            } 
          }
        });
        
        if (updatedSession) {
          return sendSuccess(reply, { session: updatedSession });
        }
      }

      return sendSuccess(reply, { session });
    } catch (error) {
      return sendError(reply, 'CHAT_ERROR', 'Failed to fetch chat session', 500);
    }
  });

  // POST /api/v1/chat/sessions/:id/messages
  fastify.post('/chat/sessions/:id/messages', {
    preHandler: async (request, reply) => {
      if (!env.FEATURE_CHAT_REVIEW) {
        return sendError(reply, 'FEATURE_DISABLED', 'Chat review feature is not enabled', 403);
      }
      
      try {
        request.body = SendMessageSchema.parse(request.body);
      } catch (error) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid request body', 422);
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { message } = request.body as { message: string };
      
      await chatService.handleUserMessage(id, message);
      
      return sendSuccess(reply, { message: 'Message sent successfully' });
    } catch (error) {
      return sendError(reply, 'CHAT_ERROR', 'Failed to send message', 500);
    }
  });

  // POST /api/v1/chat/sessions/:id/import
  fastify.post('/chat/sessions/:id/import', {
    preHandler: async (request, reply) => {
      if (!env.FEATURE_CHAT_REVIEW) {
        return sendError(reply, 'FEATURE_DISABLED', 'Chat review feature is not enabled', 403);
      }
      
      try {
        request.body = z.object({
          projectId: z.string().uuid()
        }).parse(request.body);
      } catch (error) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid request body', 422);
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { projectId } = request.body as { projectId: string };
      
      await chatService.importToProject(id, projectId);
      
      return sendSuccess(reply, { message: 'Review imported successfully' });
    } catch (error) {
      return sendError(reply, 'CHAT_ERROR', 'Failed to import review', 500);
    }
  });

  // GET /api/v1/chat/sessions/:id/status
  fastify.get('/chat/sessions/:id/status', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      const status = await chatService.checkJobStatus(id);
      
      return sendSuccess(reply, { status });
    } catch (error) {
      return sendError(reply, 'CHAT_ERROR', 'Failed to check status', 500);
    }
  });

  // GET /api/v1/chat/sessions (list user's sessions)
  fastify.get('/chat/sessions', async (request, reply) => {
    try {
      const sessions = await prisma.chatSession.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      return sendSuccess(reply, { sessions });
    } catch (error) {
      return sendError(reply, 'CHAT_ERROR', 'Failed to fetch sessions', 500);
    }
  });
}
