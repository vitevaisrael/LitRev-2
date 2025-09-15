import { FastifyInstance } from 'fastify';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../lib/prisma';

export async function searchRunsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/search-runs/:runId
  fastify.get('/search-runs/:runId', async (request, reply) => {
    try {
      const { runId } = request.params as { runId: string };
      const userId = (request as any).user?.id;

      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User not authenticated', 401);
      }

      const searchRun = await prisma.searchRun.findUnique({
        where: { id: runId },
        include: {
          savedSearch: {
            include: {
              project: { select: { id: true, title: true, ownerId: true } }
            }
          },
          searchResults: {
            select: {
              id: true,
              title: true,
              year: true,
              doi: true,
              pmid: true,
              source: true,
              journal: true
            }
          }
        }
      });

      if (!searchRun) {
        return sendError(reply, 'NOT_FOUND', 'Search run not found', 404);
      }

      // Verify project ownership
      if (searchRun.savedSearch.project.ownerId !== userId) {
        return sendError(reply, 'FORBIDDEN', 'Access denied', 403);
      }

      // Get provider stats from metadata
      const providerStats = searchRun.metadata?.providerStats || {};
      const dedupeStats = searchRun.metadata?.dedupeStats || {};

      return sendSuccess(reply, {
        id: searchRun.id,
        status: searchRun.status,
        createdAt: searchRun.createdAt,
        updatedAt: searchRun.updatedAt,
        metadata: searchRun.metadata,
        providerStats,
        dedupeStats,
        resultCount: searchRun.searchResults.length,
        results: searchRun.searchResults
      });
    } catch (error) {
      console.error('Error fetching search run:', error);
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to fetch search run', 500);
    }
  });

  // GET /api/v1/search-runs
  fastify.get('/search-runs', async (request, reply) => {
    try {
      const { 
        projectId, 
        savedSearchId, 
        status, 
        limit = 20, 
        offset = 0 
      } = request.query as {
        projectId?: string;
        savedSearchId?: string;
        status?: string;
        limit?: number;
        offset?: number;
      };

      const userId = (request as any).user?.id;

      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User not authenticated', 401);
      }

      const where: any = {};

      if (projectId) {
        // Verify project ownership
        const project = await prisma.project.findFirst({
          where: { id: projectId, ownerId: userId }
        });

        if (!project) {
          return sendError(reply, 'NOT_FOUND', 'Project not found', 404);
        }

        where.savedSearch = { projectId };
      }

      if (savedSearchId) {
        where.savedSearchId = savedSearchId;
      }

      if (status) {
        where.status = status;
      }

      const searchRuns = await prisma.searchRun.findMany({
        where,
        include: {
          savedSearch: {
            include: {
              project: { select: { id: true, title: true, ownerId: true } }
            }
          },
          _count: {
            select: { searchResults: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      // Filter out runs from projects not owned by user
      const filteredRuns = searchRuns.filter(run => 
        run.savedSearch.project.ownerId === userId
      );

      return sendSuccess(reply, {
        searchRuns: filteredRuns.map(run => ({
          id: run.id,
          status: run.status,
          createdAt: run.createdAt,
          updatedAt: run.updatedAt,
          metadata: run.metadata,
          savedSearch: {
            id: run.savedSearch.id,
            name: run.savedSearch.name,
            project: run.savedSearch.project
          },
          resultCount: run._count.searchResults
        })),
        pagination: {
          limit,
          offset,
          total: filteredRuns.length
        }
      });
    } catch (error) {
      console.error('Error fetching search runs:', error);
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to fetch search runs', 500);
    }
  });

  // DELETE /api/v1/search-runs/:runId
  fastify.delete('/search-runs/:runId', async (request, reply) => {
    try {
      const { runId } = request.params as { runId: string };
      const userId = (request as any).user?.id;

      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User not authenticated', 401);
      }

      const searchRun = await prisma.searchRun.findUnique({
        where: { id: runId },
        include: {
          savedSearch: {
            include: {
              project: { select: { id: true, title: true, ownerId: true } }
            }
          }
        }
      });

      if (!searchRun) {
        return sendError(reply, 'NOT_FOUND', 'Search run not found', 404);
      }

      // Verify project ownership
      if (searchRun.savedSearch.project.ownerId !== userId) {
        return sendError(reply, 'FORBIDDEN', 'Access denied', 403);
      }

      // Delete search run (this will cascade to search results)
      await prisma.searchRun.delete({
        where: { id: runId }
      });

      return sendSuccess(reply, { message: 'Search run deleted' });
    } catch (error) {
      console.error('Error deleting search run:', error);
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to delete search run', 500);
    }
  });
}
