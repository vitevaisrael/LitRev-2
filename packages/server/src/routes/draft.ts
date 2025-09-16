import { FastifyInstance } from 'fastify';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../lib/prisma';
import { requireAuth, requireProjectAccess } from '../auth/middleware';
import { 
  DraftSectionSchema, 
  DraftResponseSchema, 
  DraftListResponseSchema,
  SuggestCitationsRequestSchema,
  TightenRequestSchema,
  CoverageRequestSchema,
  SuggestCitationsResponseSchema,
  TightenResponseSchema,
  CoverageResponseSchema
} from '@the-scientist/schemas';

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

  // POST /api/v1/projects/:id/draft/suggest-citations
  fastify.post('/projects/:id/draft/suggest-citations', {
    preHandler: [requireAuth, requireProjectAccess]
  }, async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      const body = SuggestCitationsRequestSchema.parse(request.body);

      const userId = (request as any).user?.id;
      if (!userId) return sendError(reply, 'UNAUTHORIZED', 'Authentication required', 401);

      const project = await prisma.project.findFirst({
        where: { id: projectId, ownerId: userId },
        select: { id: true }
      });
      if (!project) return sendError(reply, 'NOT_FOUND', 'Project not found', 404);

      const supports = await prisma.support.findMany({
        where: { claim: { projectId } },
        select: { id: true, quote: true }
      });

      if (!supports.length) {
        return sendSuccess(reply, {
          suggestions: [],
          analysisNote: 'No evidence available in ledger'
        });
      }

      const { suggestFromSupports } = await import('../modules/draft/citationScorer');
      const suggestions = suggestFromSupports(body.text, supports);

      await prisma.auditLog.create({
        data: {
          projectId,
          userId,
          action: 'draft_suggest_citations',
          details: { section: body.section, textLength: body.text.length, suggestionsCount: suggestions.length }
        }
      });

      const result = SuggestCitationsResponseSchema.parse({
        suggestions,
        analysisNote: suggestions.length ? `Found ${suggestions.length} relevant citations` : 'No highly relevant citations found'
      });

      return sendSuccess(reply, result);
    } catch (err) {
      return sendError(reply, 'DRAFT_ERROR', (err as any)?.message ?? 'Failed to suggest citations', 500);
    }
  });

  // POST /api/v1/projects/:id/draft/tighten
  fastify.post('/projects/:id/draft/tighten', {
    preHandler: [requireAuth, requireProjectAccess]
  }, async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      const body = TightenRequestSchema.parse(request.body);

      const userId = (request as any).user?.id;
      if (!userId) return sendError(reply, 'UNAUTHORIZED', 'Authentication required', 401);

      const project = await prisma.project.findFirst({
        where: { id: projectId, ownerId: userId },
        select: { id: true }
      });
      if (!project) return sendError(reply, 'NOT_FOUND', 'Project not found', 404);

      const useLLM = process.env.FEATURE_DRAFT_LLM === '1';
      const { tightenText } = await import('../modules/draft/tighten');
      const improvedText = await tightenText(body.text, useLLM);

      const orig = body.text.trim().split(/\s+/).length;
      const now = improvedText.trim().split(/\s+/).length;
      const changes = improvedText !== body.text
        ? [...(now < orig ? [`Reduced from ${orig} to ${now} words`] : []), 'Improved clarity and conciseness']
        : ['No significant changes'];

      await prisma.auditLog.create({
        data: {
          projectId,
          userId,
          action: 'draft_tighten',
          details: { section: body.section, originalLength: body.text.length, improvedLength: improvedText.length, changed: improvedText !== body.text, usedLLM: useLLM }
        }
      });

      const result = TightenResponseSchema.parse({ improvedText, changes });
      return sendSuccess(reply, result);
    } catch (err) {
      return sendError(reply, 'DRAFT_ERROR', (err as any)?.message ?? 'Failed to tighten text', 500);
    }
  });

  // POST /api/v1/projects/:id/draft/coverage
  fastify.post('/projects/:id/draft/coverage', {
    preHandler: [requireAuth, requireProjectAccess]
  }, async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      const body = CoverageRequestSchema.parse(request.body);

      const userId = (request as any).user?.id;
      if (!userId) return sendError(reply, 'UNAUTHORIZED', 'Authentication required', 401);

      const project = await prisma.project.findFirst({
        where: { id: projectId, ownerId: userId },
        select: { id: true }
      });
      if (!project) return sendError(reply, 'NOT_FOUND', 'Project not found', 404);

      const text = body.text;
      const rx = /\[SUPPORT:([a-f0-9-]+)\]/gi;
      const cited = new Set<string>();
      let m;
      while ((m = rx.exec(text)) !== null) cited.add(m[1]);

      if (cited.size) {
        const citedArray = Array.from(cited);
        const rows = await prisma.support.findMany({
          where: { id: { in: citedArray }, claim: { projectId } },
          select: { id: true }
        });
        const ok = new Set(rows.map(r => r.id));
        for (const id of citedArray) if (!ok.has(id)) cited.delete(id);
      }

      const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 20);
      const cues = ['show', 'demonstrate', 'indicate', 'suggest', 'evidence', 'study', 'research', 'found', 'conclude', 'significant', 'improved', 'association', 'effect'];

      const claims: Array<{ text: string; start: number }> = [];
      let pos = 0;
      for (const s of sentences) {
        const low = s.toLowerCase();
        if (cues.some(c => low.includes(c))) {
          const idx = text.indexOf(s, pos);
          claims.push({ text: s, start: idx >= 0 ? idx : pos });
        }
        pos += s.length + 1;
      }

      const totalClaims = claims.length;
      const hasChipNear = (c: { text: string; start: number }) => {
        for (const id of Array.from(cited)) {
          const at = text.indexOf(`[SUPPORT:${id}]`);
          if (at >= 0 && Math.abs(at - c.start) <= c.text.length + 50) return true;
        }
        return false;
      };

      const citedClaims = claims.filter(hasChipNear).length;
      const score = totalClaims ? citedClaims / totalClaims : 1;

      const gaps = claims.filter(c => !hasChipNear(c))
        .slice(0, 5)
        .map((c, i) => ({ text: c.text.length > 100 ? c.text.slice(0, 97) + '...' : c.text, position: i }));

      const suggestions = [
        ...(gaps.length ? [`Add citations for ${gaps.length} uncited claim(s)`] : []),
        ...(!cited.size && totalClaims ? ['Consider adding evidence from the ledger'] : []),
        ...(score < 0.5 && totalClaims > 2 ? ['Low citation coverage—review evidence ledger'] : [])
      ];

      await prisma.auditLog.create({
        data: {
          projectId,
          userId,
          action: 'draft_coverage_check',
          details: { section: body.section, score: Number(score.toFixed(3)), totalClaims, citedClaims, gapsFound: gaps.length }
        }
      });

      const result = CoverageResponseSchema.parse({
        score: Number(score.toFixed(3)),
        citedClaims,
        totalClaims,
        gaps: gaps.length ? gaps : undefined,
        suggestions: suggestions.length ? suggestions : undefined
      });

      return sendSuccess(reply, result);
    } catch (err) {
      return sendError(reply, 'DRAFT_ERROR', (err as any)?.message ?? 'Failed to analyze coverage', 500);
    }
  });
}
