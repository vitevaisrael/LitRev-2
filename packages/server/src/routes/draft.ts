import { FastifyInstance } from 'fastify';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../lib/prisma';
import { requireAuth, requireProjectAccess } from '../auth/middleware';
import { DraftSectionSchema, DraftResponseSchema, DraftListResponseSchema } from '@the-scientist/schemas';

export async function draftRoutes(fastify: FastifyInstance) {
  // GET /api/v1/projects/:id/draft
  fastify.get('/projects/:id/draft', {
    preHandler: [requireAuth, requireProjectAccess]
  }, async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      
      // Get all draft sections for the project
      const sections = await prisma.draft.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' }
      });
      
      const result = {
        sections: sections.map((section: any) => ({
          id: section.id,
          projectId: section.projectId,
          section: section.section,
          content: section.content,
          citations: section.citations,
          createdAt: section.createdAt.toISOString(),
          updatedAt: section.updatedAt.toISOString()
        }))
      };
      
      // Validate response
      const validatedResult = DraftListResponseSchema.parse(result);
      
      return sendSuccess(reply, validatedResult);
    } catch (error) {
      if (error instanceof Error) {
        return sendError(reply, 'DRAFT_ERROR', error.message, 500);
      }
      return sendError(reply, 'DRAFT_ERROR', 'Failed to fetch draft sections', 500);
    }
  });

  // POST /api/v1/projects/:id/draft
  fastify.post('/projects/:id/draft', {
    preHandler: [requireAuth, requireProjectAccess]
  }, async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      const body = request.body as any;
      
      // Validate request body
      const validatedBody = DraftSectionSchema.parse(body);
      
      // Validate citations are Support IDs in the same project
      if (validatedBody.citations && validatedBody.citations.length > 0) {
        const supports = await prisma.support.findMany({
          where: {
            id: { in: validatedBody.citations },
            claim: {
              projectId
            }
          }
        });
        
        if (supports.length !== validatedBody.citations.length) {
          return sendError(reply, 'VALIDATION_ERROR', 'Some citations are not valid Support IDs in this project', 400);
        }
      }
      
      // Find existing draft section
      const existingDraft = await prisma.draft.findFirst({
        where: {
          projectId,
          section: validatedBody.section
        }
      });

      let draft;
      if (existingDraft) {
        // Update existing draft
        draft = await prisma.draft.update({
          where: { id: existingDraft.id },
          data: {
            content: validatedBody.content,
            citations: validatedBody.citations || []
          }
        });
      } else {
        // Create new draft
        draft = await prisma.draft.create({
          data: {
            projectId,
            section: validatedBody.section,
            content: validatedBody.content,
            citations: validatedBody.citations || []
          }
        });
      }
      
      // Create audit log
      await prisma.auditLog.create({
        data: {
          projectId,
          userId: (request as any).user.id,
          action: 'draft_saved',
          details: {
            section: validatedBody.section,
            citationCount: validatedBody.citations?.length || 0
          }
        }
      });
      
      const result = {
        id: draft.id,
        projectId: draft.projectId,
        section: draft.section,
        content: draft.content,
        citations: draft.citations,
        createdAt: draft.createdAt.toISOString(),
        updatedAt: draft.updatedAt.toISOString()
      };
      
      // Validate response
      const validatedResult = DraftResponseSchema.parse(result);
      
      return sendSuccess(reply, validatedResult);
    } catch (error) {
      if (error instanceof Error) {
        return sendError(reply, 'DRAFT_ERROR', error.message, 500);
      }
      return sendError(reply, 'DRAFT_ERROR', 'Failed to save draft section', 500);
    }
  });

  // POST /api/v1/projects/:id/draft/suggest-citations (stub)
  fastify.post('/projects/:id/draft/suggest-citations', {
    preHandler: [requireAuth, requireProjectAccess]
  }, async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      const { section, text } = request.body as { section: string; text: string };
      
      // Stub implementation - return mock citation suggestions
      const suggestions = [
        {
          id: 'suggestion-1',
          text: 'Recent studies have shown...',
          confidence: 0.85,
          supportId: 'support-123'
        }
      ];
      
      return sendSuccess(reply, { suggestions });
    } catch (error) {
      return sendError(reply, 'DRAFT_ERROR', 'Failed to suggest citations', 500);
    }
  });

  // POST /api/v1/projects/:id/draft/tighten (stub)
  fastify.post('/projects/:id/draft/tighten', {
    preHandler: [requireAuth, requireProjectAccess]
  }, async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      const { section, text } = request.body as { section: string; text: string };
      
      // Stub implementation - return improved text
      const improvedText = text + ' [Improved by AI]';
      
      return sendSuccess(reply, { improvedText });
    } catch (error) {
      return sendError(reply, 'DRAFT_ERROR', 'Failed to tighten text', 500);
    }
  });

  // POST /api/v1/projects/:id/draft/coverage (stub)
  fastify.post('/projects/:id/draft/coverage', {
    preHandler: [requireAuth, requireProjectAccess]
  }, async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      const { section, text } = request.body as { section: string; text: string };
      
      // Stub implementation - return coverage analysis
      const coverage = {
        score: 0.75,
        gaps: ['Missing evidence for claim X', 'Need more recent studies'],
        suggestions: ['Add citation for recent RCT', 'Include meta-analysis']
      };
      
      return sendSuccess(reply, coverage);
    } catch (error) {
      return sendError(reply, 'DRAFT_ERROR', 'Failed to analyze coverage', 500);
    }
  });
}
