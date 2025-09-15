import { FastifyInstance } from 'fastify';
import { sendSuccess, sendError } from '../utils/response';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getIntegrityStats } from '../services/integrity';

export async function adminRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/journal-blocklist
  fastify.get('/admin/journal-blocklist', async (request, reply) => {
    try {
      const { limit = 50, offset = 0, search } = request.query as {
        limit?: number;
        offset?: number;
        search?: string;
      };

      const where: any = {};
      if (search) {
        where.OR = [
          { issn: { contains: search, mode: 'insensitive' } },
          { note: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [blocklist, total] = await Promise.all([
        prisma.journalBlocklist.findMany({
          where,
          include: {
            addedByUser: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { addedAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.journalBlocklist.count({ where })
      ]);

      return sendSuccess(reply, {
        blocklist: blocklist.map((entry: any) => ({
          id: entry.id,
          issn: entry.issn,
          note: entry.note,
          addedAt: entry.addedAt,
          addedBy: entry.addedByUser
        })),
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + limit < total
        }
      });
    } catch (error) {
      console.error('Error fetching journal blocklist:', error);
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to fetch journal blocklist', 500);
    }
  });

  // POST /api/v1/admin/journal-blocklist
  fastify.post('/admin/journal-blocklist', async (request, reply) => {
    try {
      const { issn, note } = request.body as {
        issn: string;
        note?: string;
      };

      const userId = (request as any).user?.id;
      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User not authenticated', 401);
      }

      // Check if ISSN already exists
      const existing = await prisma.journalBlocklist.findUnique({
        where: { issn }
      });

      if (existing) {
        return sendError(reply, 'CONFLICT', 'ISSN already in blocklist', 409);
      }

      // Create blocklist entry
      const blocklistEntry = await prisma.journalBlocklist.create({
        data: {
          issn,
          note,
          addedBy: userId
        },
        include: {
          addedByUser: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          projectId: 'admin', // Special project ID for admin actions
          userId,
          action: 'journal_blocklist_added',
          details: ({
            issn,
            note,
            blocklistEntryId: blocklistEntry.id
          }) as unknown as Prisma.InputJsonValue
        }
      });

      return sendSuccess(reply, {
        id: blocklistEntry.id,
        issn: blocklistEntry.issn,
        note: blocklistEntry.note,
        addedAt: blocklistEntry.addedAt,
        addedBy: blocklistEntry.addedByUser
      }, 201);
    } catch (error) {
      console.error('Error adding to journal blocklist:', error);
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to add to journal blocklist', 500);
    }
  });

  // PUT /api/v1/admin/journal-blocklist/:id
  fastify.put('/admin/journal-blocklist/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { note } = request.body as { note?: string };

      const userId = (request as any).user?.id;
      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User not authenticated', 401);
      }

      // Check if entry exists
      const existing = await prisma.journalBlocklist.findUnique({
        where: { id }
      });

      if (!existing) {
        return sendError(reply, 'NOT_FOUND', 'Blocklist entry not found', 404);
      }

      // Update entry
      const updatedEntry = await prisma.journalBlocklist.update({
        where: { id },
        data: { note },
        include: {
          addedByUser: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          projectId: 'admin',
          userId,
          action: 'journal_blocklist_updated',
          details: {
            blocklistEntryId: id,
            oldNote: existing.note,
            newNote: note
          }
        }
      });

      return sendSuccess(reply, {
        id: updatedEntry.id,
        issn: updatedEntry.issn,
        note: updatedEntry.note,
        addedAt: updatedEntry.addedAt,
        addedBy: updatedEntry.addedByUser
      });
    } catch (error) {
      console.error('Error updating journal blocklist:', error);
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to update journal blocklist', 500);
    }
  });

  // DELETE /api/v1/admin/journal-blocklist/:id
  fastify.delete('/admin/journal-blocklist/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const userId = (request as any).user?.id;
      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User not authenticated', 401);
      }

      // Check if entry exists
      const existing = await prisma.journalBlocklist.findUnique({
        where: { id }
      });

      if (!existing) {
        return sendError(reply, 'NOT_FOUND', 'Blocklist entry not found', 404);
      }

      // Delete entry
      await prisma.journalBlocklist.delete({
        where: { id }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          projectId: 'admin',
          userId,
          action: 'journal_blocklist_removed',
          details: {
            blocklistEntryId: id,
            issn: existing.issn,
            note: existing.note
          }
        }
      });

      return sendSuccess(reply, { message: 'Blocklist entry deleted' });
    } catch (error) {
      console.error('Error deleting from journal blocklist:', error);
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to delete from journal blocklist', 500);
    }
  });

  // GET /api/v1/admin/integrity-stats
  fastify.get('/admin/integrity-stats', async (request, reply) => {
    try {
      const { projectId } = request.query as { projectId?: string };

      if (projectId) {
        // Get stats for specific project
        const stats = await getIntegrityStats(projectId);
        return sendSuccess(reply, { projectId, ...stats });
      } else {
        // Get global stats
        const [totalCandidates, flaggedCandidates, blocklistCount] = await Promise.all([
          prisma.candidate.count(),
          prisma.candidate.count({
            where: {
              flags: { not: { equals: {} } }
            }
          }),
          prisma.journalBlocklist.count()
        ]);

        return sendSuccess(reply, {
          totalCandidates,
          flaggedCandidates,
          blocklistCount,
          flagRate: totalCandidates > 0 ? (flaggedCandidates / totalCandidates) * 100 : 0
        });
      }
    } catch (error) {
      console.error('Error fetching integrity stats:', error);
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to fetch integrity stats', 500);
    }
  });

  // POST /api/v1/admin/integrity-check
  fastify.post('/admin/integrity-check', async (request, reply) => {
    try {
      const { projectId, candidateIds } = request.body as {
        projectId: string;
        candidateIds?: string[];
      };

      const userId = (request as any).user?.id;
      if (!userId) {
        return sendError(reply, 'UNAUTHORIZED', 'User not authenticated', 401);
      }

      // Get candidates to check
      const where: any = { projectId };
      if (candidateIds && candidateIds.length > 0) {
        where.id = { in: candidateIds };
      }

      const candidates = await prisma.candidate.findMany({
        where,
        select: {
          id: true,
          title: true,
          journal: true,
          doi: true,
          pmid: true,
          flags: true
        }
      });

      if (candidates.length === 0) {
        return sendError(reply, 'NOT_FOUND', 'No candidates found to check', 404);
      }

      // Run integrity checks
      const { generateIntegrityFlags } = await import('../services/integrity');
      const results = [];

      for (const candidate of candidates) {
        const flags = await generateIntegrityFlags({
          title: candidate.title,
          journal: candidate.journal || '',
          doi: candidate.doi || undefined,
          pmid: candidate.pmid || undefined,
          source: 'candidate'
        });

        // Update candidate with new flags
        await prisma.candidate.update({
          where: { id: candidate.id },
          data: { flags: flags as unknown as Prisma.InputJsonValue }
        });

        results.push({
          candidateId: candidate.id,
          title: candidate.title,
          flags
        });
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          projectId,
          userId,
          action: 'integrity_check_run',
          details: ({
            candidateCount: candidates.length,
            results: results.map(r => ({
              candidateId: r.candidateId,
              flags: r.flags
            }))
          }) as unknown as Prisma.InputJsonValue
        }
      });

      return sendSuccess(reply, {
        checkedCount: candidates.length,
        results
      });
    } catch (error) {
      console.error('Error running integrity check:', error);
      return sendError(reply, 'INTERNAL_ERROR', 'Failed to run integrity check', 500);
    }
  });
}
