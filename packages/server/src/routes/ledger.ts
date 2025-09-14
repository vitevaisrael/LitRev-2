import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod';

const prisma = new PrismaClient();

const CreateClaimSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  source: z.string().optional()
}).strict();

const CreateSupportSchema = z.object({
  claimId: z.string().uuid(),
  page: z.number().int().positive(),
  sentence: z.number().int().positive(),
  text: z.string().min(1)
}).strict();

export async function ledgerRoutes(fastify: FastifyInstance) {
  // GET /api/v1/projects/:id/ledger/claims
  fastify.get('/projects/:id/ledger/claims', async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      
      const claims = await prisma.claim.findMany({
        where: { projectId },
        include: {
          supports: true
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return sendSuccess(reply, { claims });
    } catch (error) {
      return sendError(reply, 'LEDGER_ERROR', 'Failed to fetch claims', 500);
    }
  });

  // POST /api/v1/projects/:id/ledger/claims
  fastify.post('/projects/:id/ledger/claims', {
    preHandler: async (request, reply) => {
      try {
        request.body = CreateClaimSchema.parse(request.body);
      } catch (error) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid request body', 422);
      }
    }
  }, async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      const claimData = request.body as any;
      const defaultUserId = '00000000-0000-0000-0000-000000000000';

      const claim = await prisma.$transaction(async (tx) => {
        const newClaim = await tx.claim.create({
          data: {
            ...claimData,
            projectId
          }
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            projectId,
            userId: defaultUserId,
            action: 'claim_created',
            details: { claimId: newClaim.id, title: claimData.title }
          }
        });

        return newClaim;
      });
      
      return sendSuccess(reply, { claim }, 201);
    } catch (error) {
      return sendError(reply, 'LEDGER_ERROR', 'Failed to create claim', 500);
    }
  });

  // POST /api/v1/projects/:id/ledger/supports
  fastify.post('/projects/:id/ledger/supports', {
    preHandler: async (request, reply) => {
      try {
        request.body = CreateSupportSchema.parse(request.body);
      } catch (error) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid request body', 422);
      }
    }
  }, async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      const supportData = request.body as any;
      const defaultUserId = '00000000-0000-0000-0000-000000000000';

      // Verify claim exists and belongs to project
      const claim = await prisma.claim.findFirst({
        where: {
          id: supportData.claimId,
          projectId
        }
      });

      if (!claim) {
        return sendError(reply, 'NOT_FOUND', 'Claim not found', 404);
      }

      const support = await prisma.$transaction(async (tx) => {
        const newSupport = await tx.support.create({
          data: {
            ...supportData,
            projectId
          }
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            projectId,
            userId: defaultUserId,
            action: 'support_created',
            details: { 
              supportId: newSupport.id, 
              claimId: supportData.claimId,
              page: supportData.page,
              sentence: supportData.sentence
            }
          }
        });

        return newSupport;
      });
      
      return sendSuccess(reply, { support }, 201);
    } catch (error) {
      return sendError(reply, 'LEDGER_ERROR', 'Failed to create support', 500);
    }
  });
}
