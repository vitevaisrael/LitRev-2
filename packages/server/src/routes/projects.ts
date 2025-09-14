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
      
      return sendSuccess(reply, { prisma: prismaData });
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
        orderBy: { ts: 'desc' },
        take: limit
      });
      
      return sendSuccess(reply, { auditLogs });
    } catch (error) {
      return sendError(reply, 'DATABASE_ERROR', 'Failed to fetch audit logs', 500);
    }
  });
}
