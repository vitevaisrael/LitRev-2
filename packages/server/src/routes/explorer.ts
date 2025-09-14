import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const ExplorerRunSchema = z.object({
  prompt: z.string().optional(),
  model: z.string().optional()
}).strict();

const ImportRefsSchema = z.object({
  runId: z.string().uuid(),
  refs: z.array(z.object({
    doi: z.string().optional(),
    pmid: z.string().optional(),
    title: z.string().optional(),
    journal: z.string().optional(),
    year: z.number().int().optional()
  }))
}).strict();

export async function explorerRoutes(fastify: FastifyInstance) {
  // POST /api/v1/projects/:id/explorer/run
  fastify.post('/projects/:id/explorer/run', {
    preHandler: async (request, reply) => {
      try {
        request.body = ExplorerRunSchema.parse(request.body);
      } catch (error) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid request body', 422);
      }
    }
  }, async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      const { prompt, model } = request.body as { prompt?: string; model?: string };
      
      // Create job status
      const jobId = randomUUID();
      const jobStatus = await prisma.jobStatus.create({
        data: {
          jobId,
          projectId,
          type: 'explorer',
          status: 'pending',
          progress: { step: 'initializing', count: 0, total: 1 }
        }
      });

      // TODO: Queue actual explorer job
      // For now, just return the job ID
      
      return sendSuccess(reply, { jobId });
    } catch (error) {
      return sendError(reply, 'EXPLORER_ERROR', 'Failed to start explorer run', 500);
    }
  });

  // GET /api/v1/projects/:id/explorer/:runId
  fastify.get('/projects/:id/explorer/:runId', async (request, reply) => {
    try {
      const { id: projectId, runId } = request.params as { id: string; runId: string };
      
      const explorerRun = await prisma.explorerRun.findFirst({
        where: { runId, projectId }
      });

      if (!explorerRun) {
        return sendError(reply, 'NOT_FOUND', 'Explorer run not found', 404);
      }

      return sendSuccess(reply, { explorer: explorerRun });
    } catch (error) {
      return sendError(reply, 'EXPLORER_ERROR', 'Failed to fetch explorer run', 500);
    }
  });

  // POST /api/v1/projects/:id/explorer/import
  fastify.post('/projects/:id/explorer/import', {
    preHandler: async (request, reply) => {
      try {
        request.body = ImportRefsSchema.parse(request.body);
      } catch (error) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid request body', 422);
      }
    }
  }, async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      const { runId, refs } = request.body as { runId: string; refs: any[] };
      
      const imported = await prisma.$transaction(async (tx) => {
        const candidates = [];
        
        for (const ref of refs) {
          // Check if candidate already exists
          const existing = await tx.candidate.findFirst({
            where: {
              projectId,
              OR: [
                ref.doi ? { doi: ref.doi } : undefined,
                ref.pmid ? { pmid: ref.pmid } : undefined
              ].filter(Boolean)
            }
          });

          if (!existing && (ref.doi || ref.pmid)) {
            const candidate = await tx.candidate.create({
              data: {
                projectId,
                doi: ref.doi,
                pmid: ref.pmid,
                title: ref.title || 'Unknown Title',
                journal: ref.journal || 'Unknown Journal',
                year: ref.year || new Date().getFullYear()
              }
            });
            candidates.push(candidate);
          }
        }

        return candidates;
      });

      return sendSuccess(reply, { imported });
    } catch (error) {
      return sendError(reply, 'IMPORT_ERROR', 'Failed to import references', 500);
    }
  });
}
