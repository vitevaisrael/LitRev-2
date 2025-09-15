import { FastifyInstance } from 'fastify';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../lib/prisma';
import { searchQueue } from '../jobs/searchQueue';
import { requireAuth, requireProjectAccess } from '../auth/middleware';
import { QueryManifest } from '@the-scientist/schemas';

export async function savedSearchesRoutes(fastify: FastifyInstance) {
  // POST /api/v1/saved-searches
  fastify.post('/saved-searches', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const { projectId, name, description, manifest } = request.body as {
        projectId: string;
        name: string;
        description?: string;
        manifest: QueryManifest;
      };

      const userId = (request as any).user.id;

      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: { id: projectId, ownerId: userId }
      });

      if (!project) {
        return sendError(reply, 'NOT_FOUND', 'Project not found', 404);
      }

      // Create saved search
      const savedSearch = await prisma.savedSearch.create({
        data: {
          projectId,
          name,
          description,
          manifest: manifest,
          createdBy: userId
        }
      });

      return sendSuccess(reply, savedSearch, 201);
    } catch (error) {
      console.error('Error creating saved search:', error);
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to create saved search', 500);
    }
  });

  // POST /api/v1/saved-searches/:id/run
  fastify.post('/saved-searches/:id/run', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request as any).user.id;

      // Get saved search
      const savedSearch = await prisma.savedSearch.findUnique({
        where: { id },
        include: { project: true }
      });

      if (!savedSearch) {
        return sendError(reply, 'NOT_FOUND', 'Saved search not found', 404);
      }

      // Verify project ownership
      if (savedSearch.project.ownerId !== userId) {
        return sendError(reply, 'FORBIDDEN', 'Access denied', 403);
      }

      // Create search run
      const searchRun = await prisma.searchRun.create({
        data: {
          savedSearchId: id,
          status: 'pending',
          metadata: {}
        }
      });

      // Enqueue search job
      await searchQueue.add('search', {
        searchRunId: searchRun.id,
        manifest: savedSearch.manifest as QueryManifest
      });

      return sendSuccess(reply, { searchRunId: searchRun.id }, 201);
    } catch (error) {
      console.error('Error running saved search:', error);
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to run saved search', 500);
    }
  });

  // GET /api/v1/saved-searches
  fastify.get('/saved-searches', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const { projectId } = request.query as { projectId?: string };
      const userId = (request as any).user.id;

      const where: any = {};
      if (projectId) {
        // Verify project ownership
        const project = await prisma.project.findFirst({
          where: { id: projectId, ownerId: userId }
        });

        if (!project) {
          return sendError(reply, 'NOT_FOUND', 'Project not found', 404);
        }

        where.projectId = projectId;
      } else {
        // Get all projects owned by user
        const userProjects = await prisma.project.findMany({
          where: { ownerId: userId },
          select: { id: true }
        });

        where.projectId = { in: userProjects.map((p: any) => p.id) };
      }

      const savedSearches = await prisma.savedSearch.findMany({
        where,
        include: {
          project: { select: { id: true, title: true, ownerId: true } },
          searchRuns: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, status: true, createdAt: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return sendSuccess(reply, savedSearches);
    } catch (error) {
      console.error('Error fetching saved searches:', error);
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to fetch saved searches', 500);
    }
  });

  // GET /api/v1/saved-searches/:id
  fastify.get('/saved-searches/:id', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request as any).user.id;

      const savedSearch = await prisma.savedSearch.findUnique({
        where: { id },
        include: {
          project: { select: { id: true, title: true, ownerId: true } },
          searchRuns: {
            orderBy: { createdAt: 'desc' },
            select: { id: true, status: true, createdAt: true, metadata: true }
          }
        }
      });

      if (!savedSearch) {
        return sendError(reply, 'NOT_FOUND', 'Saved search not found', 404);
      }

      // Verify project ownership
      if (savedSearch.project.ownerId !== userId) {
        return sendError(reply, 'FORBIDDEN', 'Access denied', 403);
      }

      return sendSuccess(reply, savedSearch);
    } catch (error) {
      console.error('Error fetching saved search:', error);
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to fetch saved search', 500);
    }
  });

  // DELETE /api/v1/saved-searches/:id
  fastify.delete('/saved-searches/:id', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request as any).user.id;

      const savedSearch = await prisma.savedSearch.findUnique({
        where: { id },
        include: { project: true }
      });

      if (!savedSearch) {
        return sendError(reply, 'NOT_FOUND', 'Saved search not found', 404);
      }

      // Verify project ownership
      if (savedSearch.project.ownerId !== userId) {
        return sendError(reply, 'FORBIDDEN', 'Access denied', 403);
      }

      await prisma.savedSearch.delete({
        where: { id }
      });

      return sendSuccess(reply, { message: 'Saved search deleted' });
    } catch (error) {
      console.error('Error deleting saved search:', error);
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to delete saved search', 500);
    }
  });
}
