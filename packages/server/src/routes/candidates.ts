import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { PaginationSchema, PaginatedResponseSchema } from '@the-scientist/schemas';
import { z } from 'zod';

const prisma = new PrismaClient();

const CandidateFiltersSchema = z.object({
  q: z.string().optional(),
  year_min: z.coerce.number().int().optional(),
  year_max: z.coerce.number().int().optional(),
  journal: z.string().optional(),
  status: z.enum(['included', 'excluded', 'undecided']).optional()
}).strict();

export async function candidatesRoutes(fastify: FastifyInstance) {
  // GET /api/v1/projects/:id/candidates
  fastify.get('/projects/:id/candidates', async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      const query = request.query as any;
      
      // Parse pagination and filters
      const pagination = PaginationSchema.parse({
        page: query.page,
        pageSize: query.pageSize
      });
      
      const filters = CandidateFiltersSchema.parse({
        q: query.q,
        year_min: query.year_min,
        year_max: query.year_max,
        journal: query.journal,
        status: query.status
      });

      // Build where clause
      const where: any = { projectId };

      if (filters.q) {
        where.OR = [
          { title: { contains: filters.q, mode: 'insensitive' } },
          { abstract: { contains: filters.q, mode: 'insensitive' } }
        ];
      }

      if (filters.year_min || filters.year_max) {
        where.year = {};
        if (filters.year_min) where.year.gte = filters.year_min;
        if (filters.year_max) where.year.lte = filters.year_max;
      }

      if (filters.journal) {
        where.journal = { contains: filters.journal, mode: 'insensitive' };
      }

      // Handle status filter (based on last decision)
      if (filters.status && filters.status !== 'undecided') {
        where.decisions = {
          some: {
            action: filters.status === 'included' ? 'include' : 'exclude'
          }
        };
      } else if (filters.status === 'undecided') {
        where.decisions = { none: {} };
      }

      // Get total count
      const total = await prisma.candidate.count({ where });

      // Get paginated results
      const items = await prisma.candidate.findMany({
        where,
        include: {
          decisions: {
            orderBy: { ts: 'desc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize
      });

      return sendSuccess(reply, {
        items,
        total,
        page: pagination.page,
        pageSize: pagination.pageSize
      });
    } catch (error) {
      return sendError(reply, 'CANDIDATES_ERROR', 'Failed to fetch candidates', 500);
    }
  });
}
