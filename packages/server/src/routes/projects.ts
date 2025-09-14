import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod';

const prisma = new PrismaClient();

const CreateProjectSchema = z.object({
  title: z.string().min(1)
}).strict();

export async function projectsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/projects
  fastify.get('/projects', async (request, reply) => {
    try {
      const projects = await prisma.project.findMany({
        include: {
          prisma: true
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return sendSuccess(reply, { projects });
    } catch (error) {
      return sendError(reply, 'DATABASE_ERROR', 'Failed to fetch projects', 500);
    }
  });

  // POST /api/v1/projects
  fastify.post('/projects', {
    preHandler: async (request, reply) => {
      try {
        request.body = CreateProjectSchema.parse(request.body);
      } catch (error) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid request body', 422);
      }
    }
  }, async (request, reply) => {
    try {
      const { title } = request.body as { title: string };
      
      // For now, use a default user ID (in real app, get from JWT)
      const defaultUserId = '00000000-0000-0000-0000-000000000000';
      
      const project = await prisma.$transaction(async (tx) => {
        const newProject = await tx.project.create({
          data: {
            title,
            ownerId: defaultUserId,
            settings: { preferOA: true }
          },
          include: {
            prisma: true
          }
        });

        // Create audit log entry
        await tx.auditLog.create({
          data: {
            projectId: newProject.id,
            userId: defaultUserId,
            action: 'project_created',
            details: { title }
          }
        });

        return newProject;
      });
      
      return sendSuccess(reply, { project }, 201);
    } catch (error) {
      return sendError(reply, 'DATABASE_ERROR', 'Failed to create project', 500);
    }
  });

  // GET /api/v1/projects/:id/prisma
  fastify.get('/projects/:id/prisma', async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      
      const prismaData = await prisma.prismaData.findUnique({
        where: { projectId }
      });
      
      if (!prismaData) {
        return sendError(reply, 'NOT_FOUND', 'PRISMA data not found', 404);
      }

      // Get audit logs to build history
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          projectId,
          action: { in: ['decision_made', 'candidate_imported', 'project_created'] }
        },
        orderBy: { timestamp: 'asc' },
        take: 100 // Limit to last 100 relevant events
      });

      // Build history from audit logs
      const history = [];
      let currentCounts = {
        identified: 0,
        duplicates: 0,
        screened: 0,
        included: 0,
        excluded: 0
      };

      // Add initial state
      history.push({
        timestamp: new Date().toISOString(),
        ...currentCounts
      });

      // Process audit logs to build history
      for (const log of auditLogs) {
        if (log.action === 'project_created') {
          // Project creation - start with identified count
          currentCounts.identified = prismaData.identified;
        } else if (log.action === 'candidate_imported') {
          // Import - increment identified
          currentCounts.identified += 1;
        } else if (log.action === 'decision_made') {
          // Decision - increment screened and include/exclude
          currentCounts.screened += 1;
          if (log.details?.action === 'include') {
            currentCounts.included += 1;
          } else if (log.details?.action === 'exclude') {
            currentCounts.excluded += 1;
          }
        }

        history.push({
          timestamp: log.timestamp.toISOString(),
          ...currentCounts
        });
      }

      // If no history exists, create a single point from current data
      if (history.length === 1) {
        history[0] = {
          timestamp: new Date().toISOString(),
          identified: prismaData.identified,
          duplicates: prismaData.duplicates,
          screened: prismaData.screened,
          included: prismaData.included,
          excluded: prismaData.excluded
        };
      }
      
      return sendSuccess(reply, { 
        prisma: prismaData,
        history: history.slice(-20) // Return last 20 history points
      });
    } catch (error) {
      return sendError(reply, 'DATABASE_ERROR', 'Failed to fetch PRISMA data', 500);
    }
  });

  // GET /api/v1/projects/:id/audit-logs
  fastify.get('/projects/:id/audit-logs', async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      const query = request.query as any;
      const limit = Math.min(parseInt(query.limit || '20'), 100);
      
      const auditLogs = await prisma.auditLog.findMany({
        where: { projectId },
        orderBy: { timestamp: 'desc' },
        take: limit
      });
      
      return sendSuccess(reply, { auditLogs });
    } catch (error) {
      return sendError(reply, 'DATABASE_ERROR', 'Failed to fetch audit logs', 500);
    }
  });
}
