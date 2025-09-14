import { FastifyInstance } from 'fastify';
import { ScreeningProposalSchema, DecideBodySchema } from '@the-scientist/schemas';
import { screener } from '../modules/screen/screener';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ProposeSchema = z.object({
  candidateId: z.string().uuid()
}).strict();

const BulkDecideSchema = z.object({
  decisions: z.array(DecideBodySchema)
}).strict();

export async function screenRoutes(fastify: FastifyInstance) {
  fastify.post('/projects/:id/screen/propose', {
    preHandler: async (request, reply) => {
      try {
        request.body = ProposeSchema.parse(request.body);
      } catch (error) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid request body', 422);
      }
    }
  }, async (request, reply) => {
    try {
      const { candidateId } = request.body as { candidateId: string };
      
      // Use LLM screener (will fall back to mock if no API key)
      const proposal = await screener.propose(candidateId);
      
      // Validate response
      const validated = ScreeningProposalSchema.parse(proposal);
      
      return sendSuccess(reply, validated);
    } catch (error) {
      return sendError(reply, 'SCREENING_ERROR', 'Failed to generate screening proposal', 500);
    }
  });

  // POST /api/v1/projects/:id/decide
  fastify.post('/projects/:id/decide', {
    preHandler: async (request, reply) => {
      try {
        request.body = DecideBodySchema.parse(request.body);
      } catch (error) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid request body', 422);
      }
    }
  }, async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      const decision = request.body as any;
      const payload = { ...decision, stage: decision.stage ?? 'title_abstract' };
      const defaultUserId = '00000000-0000-0000-0000-000000000000';

      const result = await prisma.$transaction(async (tx) => {
        // Create decision
        const newDecision = await tx.decision.create({
          data: {
            ...payload,
            projectId,
            userId: defaultUserId
          }
        });

        // Update PRISMA counters
        await tx.prismaData.upsert({
          where: { projectId },
          update: {
            screened: { increment: 1 },
            [payload.action === 'include' ? 'included' : 'excluded']: { increment: 1 }
          },
          create: {
            projectId,
            screened: 1,
            [payload.action === 'include' ? 'included' : 'excluded']: 1
          }
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            projectId,
            userId: defaultUserId,
            action: 'decision_made',
            details: { action: payload.action, candidateId: payload.candidateId }
          }
        });

        return newDecision;
      });

      return sendSuccess(reply, { decision: result });
    } catch (error) {
      return sendError(reply, 'DECISION_ERROR', 'Failed to record decision', 500);
    }
  });

  // POST /api/v1/projects/:id/decide/bulk
  fastify.post('/projects/:id/decide/bulk', {
    preHandler: async (request, reply) => {
      try {
        request.body = BulkDecideSchema.parse(request.body);
      } catch (error) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid request body', 422);
      }
    }
  }, async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      const { decisions } = request.body as { decisions: any[] };
      const payloads = decisions.map(d => ({ ...d, stage: d.stage ?? 'title_abstract' }));
      const defaultUserId = '00000000-0000-0000-0000-000000000000';

      const result = await prisma.$transaction(async (tx) => {
        // Create all decisions
        const newDecisions = await Promise.all(
          payloads.map(payload =>
            tx.decision.create({
              data: {
                ...payload,
                projectId,
                userId: defaultUserId
              }
            })
          )
        );

        // Count actions for PRISMA update
        const actionCounts = payloads.reduce((acc, d) => {
          acc[d.action] = (acc[d.action] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Update PRISMA counters
        await tx.prismaData.upsert({
          where: { projectId },
          update: {
            screened: { increment: payloads.length },
            included: { increment: actionCounts.include || 0 },
            excluded: { increment: actionCounts.exclude || 0 }
          },
          create: {
            projectId,
            screened: payloads.length,
            included: actionCounts.include || 0,
            excluded: actionCounts.exclude || 0
          }
        });

        // Create audit log with summary
        await tx.auditLog.create({
          data: {
            projectId,
            userId: defaultUserId,
            action: 'decision_made',
            details: { 
              type: 'bulk',
              count: payloads.length,
              actions: actionCounts
            }
          }
        });

        return newDecisions;
      });

      return sendSuccess(reply, { decisions: result });
    } catch (error) {
      return sendError(reply, 'BULK_DECISION_ERROR', 'Failed to record bulk decisions', 500);
    }
  });
}
