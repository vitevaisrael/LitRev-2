import { FastifyInstance } from 'fastify';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../lib/prisma';

export async function resultsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/projects/:projectId/results
  fastify.get('/projects/:projectId/results', async (request, reply) => {
    try {
      const { projectId } = request.params as { projectId: string };
      const {
        limit = 20,
        offset = 0,
        search,
        year_min,
        year_max,
        journal,
        source,
        excludeFlagged,
        flaggedOnly,
        retractedOnly,
        predatoryOnly
      } = request.query as {
        limit?: number;
        offset?: number;
        search?: string;
        year_min?: number;
        year_max?: number;
        journal?: string;
        source?: string;
        excludeFlagged?: boolean;
        flaggedOnly?: boolean;
        retractedOnly?: boolean;
        predatoryOnly?: boolean;
      };

      const userId = (request as any).user?.id;

      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User not authenticated', 401);
      }

      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: { id: projectId, ownerId: userId }
      });

      if (!project) {
        return sendError(reply, 'NOT_FOUND', 'Project not found', 404);
      }

      // Build where clause
      const where: any = {
        searchRun: {
          savedSearch: {
            projectId
          }
        }
      };

      // Add search filters
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { abstract: { contains: search, mode: 'insensitive' } },
          { journal: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (year_min || year_max) {
        where.year = {};
        if (year_min) where.year.gte = year_min;
        if (year_max) where.year.lte = year_max;
      }

      if (journal) {
        where.journal = { contains: journal, mode: 'insensitive' };
      }

      if (source) {
        where.source = source;
      }

      // Add integrity flags filtering
      if (excludeFlagged) {
        where.flags = { equals: {} };
      } else if (flaggedOnly) {
        where.flags = { not: { equals: {} } };
      } else if (retractedOnly) {
        where.flags = { path: ['retracted'], equals: true };
      } else if (predatoryOnly) {
        where.flags = { path: ['predatory'], equals: true };
      }

      // Get results
      const [results, total] = await Promise.all([
        prisma.searchResult.findMany({
          where,
          include: {
            searchRun: {
              include: {
                savedSearch: {
                  select: { id: true, name: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.searchResult.count({ where })
      ]);

      return sendSuccess(reply, {
        results: results.map(result => ({
          id: result.id,
          title: result.title,
          year: result.year,
          doi: result.doi,
          pmid: result.pmid,
          pmcid: result.pmcid,
          source: result.source,
          authors: result.authors,
          journal: result.journal,
          volume: result.volume,
          issue: result.issue,
          pages: result.pages,
          abstract: result.abstract,
          meshTerms: result.meshTerms,
          flags: result.flags,
          createdAt: result.createdAt,
          searchRun: {
            id: result.searchRun.id,
            savedSearch: result.searchRun.savedSearch
          }
        })),
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + limit < total
        }
      });
    } catch (error) {
      console.error('Error fetching results:', error);
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to fetch results', 500);
    }
  });

  // GET /api/v1/projects/:projectId/results/:resultId
  fastify.get('/projects/:projectId/results/:resultId', async (request, reply) => {
    try {
      const { projectId, resultId } = request.params as { projectId: string; resultId: string };
      const userId = (request as any).user?.id;

      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User not authenticated', 401);
      }

      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: { id: projectId, ownerId: userId }
      });

      if (!project) {
        return sendError(reply, 'NOT_FOUND', 'Project not found', 404);
      }

      const result = await prisma.searchResult.findFirst({
        where: {
          id: resultId,
          searchRun: {
            savedSearch: {
              projectId
            }
          }
        },
        include: {
          searchRun: {
            include: {
              savedSearch: {
                select: { id: true, name: true }
              }
            }
          }
        }
      });

      if (!result) {
        return sendError(reply, 'NOT_FOUND', 'Result not found', 404);
      }

      return sendSuccess(reply, {
        id: result.id,
        title: result.title,
        year: result.year,
        doi: result.doi,
        pmid: result.pmid,
        pmcid: result.pmcid,
        source: result.source,
        authors: result.authors,
        journal: result.journal,
        volume: result.volume,
        issue: result.issue,
        pages: result.pages,
        abstract: result.abstract,
        meshTerms: result.meshTerms,
        flags: result.flags,
        rawPayload: result.rawPayload,
        createdAt: result.createdAt,
        searchRun: {
          id: result.searchRun.id,
          savedSearch: result.searchRun.savedSearch
        }
      });
    } catch (error) {
      console.error('Error fetching result:', error);
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to fetch result', 500);
    }
  });

  // POST /api/v1/projects/:projectId/results/:resultId/import
  fastify.post('/projects/:projectId/results/:resultId/import', async (request, reply) => {
    try {
      const { projectId, resultId } = request.params as { projectId: string; resultId: string };
      const userId = (request as any).user?.id;

      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User not authenticated', 401);
      }

      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: { id: projectId, ownerId: userId }
      });

      if (!project) {
        return sendError(reply, 'NOT_FOUND', 'Project not found', 404);
      }

      // Get search result
      const searchResult = await prisma.searchResult.findFirst({
        where: {
          id: resultId,
          searchRun: {
            savedSearch: {
              projectId
            }
          }
        }
      });

      if (!searchResult) {
        return sendError(reply, 'NOT_FOUND', 'Result not found', 404);
      }

      // Check if candidate already exists
      const existingCandidate = await prisma.candidate.findFirst({
        where: {
          projectId,
          OR: [
            searchResult.doi ? { doi: searchResult.doi } : {},
            searchResult.pmid ? { pmid: searchResult.pmid } : {}
          ].filter(condition => Object.keys(condition).length > 0)
        }
      });

      if (existingCandidate) {
        return sendError(reply, 'CONFLICT', 'Candidate already exists', 409);
      }

      // Create candidate from search result
      const candidate = await prisma.candidate.create({
        data: {
          projectId,
          title: searchResult.title,
          journal: searchResult.journal || '',
          year: searchResult.year || new Date().getFullYear(),
          doi: searchResult.doi,
          pmid: searchResult.pmid,
          authors: searchResult.authors,
          abstract: searchResult.abstract,
          links: {
            oaUrl: searchResult.doi ? `https://doi.org/${searchResult.doi}` : undefined,
            pubmedUrl: searchResult.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${searchResult.pmid}/` : undefined
          },
          flags: searchResult.flags || {}
        }
      });

      // Update PRISMA data
      await prisma.prismaData.upsert({
        where: { projectId },
        update: {
          identified: { increment: 1 }
        },
        create: {
          projectId,
          identified: 1,
          duplicates: 0,
          screened: 0,
          included: 0,
          excluded: 0
        }
      });

      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          projectId,
          userId,
          action: 'candidate_imported',
          details: {
            candidateId: candidate.id,
            source: 'search_result',
            searchResultId: resultId,
            title: candidate.title
          }
        }
      });

      return sendSuccess(reply, candidate, 201);
    } catch (error) {
      console.error('Error importing result:', error);
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to import result', 500);
    }
  });
}
