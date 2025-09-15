import { FastifyInstance } from 'fastify';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../lib/prisma';
import { generatePrismaSvg } from '../modules/exports/prismaSvg';
import { exportToDocx } from '../exports/docxExport';
import { buildProjectDocx } from '../modules/exports/docx.js';
import { authenticate } from '../middleware/auth';
import { 
  ExportParamsSchema, 
  ExportDocxOptionsSchema,
  type ExportDocxOptions 
} from "@the-scientist/schemas";

export async function exportsRoutes(fastify: FastifyInstance) {
  // POST /api/v1/projects/:id/exports/markdown
  fastify.post('/projects/:id/exports/markdown', async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      
      // Get project details
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          problemProfile: true
        }
      });
      
      if (!project) {
        return sendError(reply, 'NOT_FOUND', 'Project not found', 404);
      }
      
      // Get draft sections
      const drafts = await prisma.draft.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' }
      });
      
      // Get included candidates
      const includedCandidates = await prisma.candidate.findMany({
        where: {
          projectId,
          decisions: {
            some: {
              action: 'include'
            }
          }
        },
        orderBy: { year: 'desc' }
      });
      
      // Generate markdown content
      let markdown = `# ${project.title}\n\n`;
      
      // Add problem profile if available
      if (project.problemProfile) {
        markdown += `## Problem Profile\n\n`;
        markdown += `**Population:** ${JSON.stringify(project.problemProfile.population)}\n\n`;
        markdown += `**Exposure:** ${JSON.stringify(project.problemProfile.exposure)}\n\n`;
        markdown += `**Comparator:** ${JSON.stringify(project.problemProfile.comparator)}\n\n`;
        markdown += `**Outcomes:** ${JSON.stringify(project.problemProfile.outcomes)}\n\n`;
      }
      
      // Add draft sections
      if (drafts.length > 0) {
        markdown += `## Draft\n\n`;
        for (const draft of drafts) {
          markdown += `### ${draft.section}\n\n`;
          markdown += `${draft.content}\n\n`;
        }
      }
      
      // Add references
      if (includedCandidates.length > 0) {
        markdown += `## References\n\n`;
        for (const candidate of includedCandidates) {
          const authors = Array.isArray(candidate.authors) ? candidate.authors.join(', ') : String(candidate.authors || 'Unknown');
          markdown += `- ${authors} (${candidate.year}). ${candidate.title}. *${candidate.journal}*`;
          if (candidate.doi) {
            markdown += `. DOI: ${candidate.doi}`;
          }
          markdown += `\n`;
        }
      }
      
      // Create audit log
      await prisma.auditLog.create({
        data: {
          projectId,
          userId: projectId, // Using projectId as userId for now
          action: 'export_run',
          details: {
            type: 'markdown'
          }
        }
      });
      
      // Set headers for file download
      reply.header('Content-Type', 'text/markdown');
      reply.header('Content-Disposition', `attachment; filename="${project.title.replace(/[^a-zA-Z0-9]/g, '_')}.md"`);
      
      return markdown;
    } catch (error) {
      if (error instanceof Error) {
        return sendError(reply, 'EXPORT_ERROR', error.message, 500);
      }
      return sendError(reply, 'EXPORT_ERROR', 'Failed to generate markdown export', 500);
    }
  });

  // POST /api/v1/projects/:id/exports/bibtex
  fastify.post('/projects/:id/exports/bibtex', async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      
      // Get project details
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });
      
      if (!project) {
        return sendError(reply, 'NOT_FOUND', 'Project not found', 404);
      }
      
      // Get included candidates
      const includedCandidates = await prisma.candidate.findMany({
        where: {
          projectId,
          decisions: {
            some: {
              action: 'include'
            }
          }
        },
        orderBy: { year: 'desc' }
      });
      
      // Generate BibTeX content
      let bibtex = '';
      
      for (const candidate of includedCandidates) {
        const authors = Array.isArray(candidate.authors) ? candidate.authors : [String(candidate.authors || 'Unknown')];
        const firstAuthor = String(authors[0] || 'Unknown').replace(/[^a-zA-Z]/g, '') || 'Unknown';
        const key = `${firstAuthor}${candidate.year}`;
        bibtex += `@article{${key},\n`;
        bibtex += `  title = {${candidate.title}},\n`;
        bibtex += `  author = {${authors.join(' and ')}},\n`;
        bibtex += `  journal = {${candidate.journal}},\n`;
        bibtex += `  year = {${candidate.year}},\n`;
        if (candidate.doi) {
          bibtex += `  doi = {${candidate.doi}},\n`;
        }
        if (candidate.pmid) {
          bibtex += `  pmid = {${candidate.pmid}},\n`;
        }
        bibtex += `}\n\n`;
      }
      
      // Create audit log
      await prisma.auditLog.create({
        data: {
          projectId,
          userId: projectId, // Using projectId as userId for now
          action: 'export_run',
          details: {
            type: 'bibtex'
          }
        }
      });
      
      // Set headers for file download
      reply.header('Content-Type', 'application/x-bibtex');
      reply.header('Content-Disposition', `attachment; filename="${project.title.replace(/[^a-zA-Z0-9]/g, '_')}.bib"`);
      
      return bibtex;
    } catch (error) {
      if (error instanceof Error) {
        return sendError(reply, 'EXPORT_ERROR', error.message, 500);
      }
      return sendError(reply, 'EXPORT_ERROR', 'Failed to generate BibTeX export', 500);
    }
  });

  // POST /api/v1/projects/:id/exports/prisma
  fastify.post('/projects/:id/exports/prisma', async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      
      // Get project details
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });
      
      if (!project) {
        return sendError(reply, 'NOT_FOUND', 'Project not found', 404);
      }
      
      // Get PRISMA data (create if doesn't exist)
      let prismaData = await prisma.prismaData.findUnique({
        where: { projectId }
      });
      
      if (!prismaData) {
        prismaData = await prisma.prismaData.create({
          data: {
            projectId,
            identified: 0,
            deduped: 0,
            screened: 0,
            included: 0,
            excluded: 0
          }
        });
      }
      
      // Generate PRISMA SVG (simplified version)
      const svg = generatePrismaSvg({
        identified: prismaData.identified,
        deduped: prismaData.deduped,
        screened: prismaData.screened,
        included: prismaData.included,
        excluded: prismaData.excluded
      });
      
      // Create audit log
      await prisma.auditLog.create({
        data: {
          projectId,
          userId: projectId, // Using projectId as userId for now
          action: 'export_run',
          details: {
            type: 'prisma'
          }
        }
      });
      
      // Set headers for file download
      reply.header('Content-Type', 'image/svg+xml');
      reply.header('Content-Disposition', `attachment; filename="${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_prisma.svg"`);
      
      return svg;
    } catch (error) {
      if (error instanceof Error) {
        return sendError(reply, 'EXPORT_ERROR', error.message, 500);
      }
      return sendError(reply, 'EXPORT_ERROR', 'Failed to generate PRISMA export', 500);
    }
  });

  // POST /api/v1/projects/:id/exports/ledger
  fastify.post('/projects/:id/exports/ledger', async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      
      // Get project details
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });
      
      if (!project) {
        return sendError(reply, 'NOT_FOUND', 'Project not found', 404);
      }
      
      // Get claims and supports with candidate metadata
      const claims = await prisma.claim.findMany({
        where: { projectId },
        include: {
          supports: {
            include: {
              candidate: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });
      
      const ledgerData = {
        project: {
          id: project.id,
          title: project.title,
          createdAt: project.createdAt
        },
        claims: claims.map((claim: any) => ({
          id: claim.id,
          text: (claim as any).text,
          supports: claim.supports.map((support: any) => ({
            id: support.id,
            quote: support.quote,
            locator: support.locator,
            candidate: support.candidate ? {
              id: support.candidate.id,
              title: support.candidate.title,
              journal: support.candidate.journal,
              year: support.candidate.year,
              authors: support.candidate.authors
            } : null
          }))
        }))
      };
      
      // Create audit log
      await prisma.auditLog.create({
        data: {
          projectId,
          userId: projectId, // Using projectId as userId for now
          action: 'export_run',
          details: {
            type: 'ledger'
          }
        }
      });
      
      // Set headers for file download
      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename="${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_ledger.json"`);
      
      return JSON.stringify(ledgerData, null, 2);
    } catch (error) {
      if (error instanceof Error) {
        return sendError(reply, 'EXPORT_ERROR', error.message, 500);
      }
      return sendError(reply, 'EXPORT_ERROR', 'Failed to generate ledger export', 500);
    }
  });

  // POST /api/v1/projects/:id/exports/docx - Enhanced DOCX Export
  fastify.post<{
    Params: { id: string };
    Body: ExportDocxOptions;
  }>(
    "/projects/:id/exports/docx",
    {
      preValidation: [authenticate],
      schema: {
        params: ExportParamsSchema,
        body: ExportDocxOptionsSchema
      }
    },
    async (request, reply) => {
      const { id: projectId } = request.params;
      const options = request.body;
      
      try {
        // Verify project ownership
        const project = await prisma.project.findFirst({
          where: {
            id: projectId,
            ownerId: (request as any).user.id
          },
          select: {
            id: true,
            title: true
          }
        });

        if (!project) {
          return sendError(reply, "PROJECT_NOT_FOUND", "Project not found or access denied", 404);
        }

        // Generate DOCX using enhanced builder
        const buffer = await buildProjectDocx(projectId, options);

        // Create audit log entry
        await prisma.auditLog.create({
          data: {
            projectId,
            userId: (request as any).user.id,
            action: "export_docx",
            details: {
              format: (options as any).format || "academic",
              includeSupports: (options as any).includeSupports,
              includePrisma: (options as any).includePrisma,
              includeProfile: (options as any).includeProfile,
              size: buffer.length,
              timestamp: new Date().toISOString()
            }
          }
        });

        // Sanitize filename
        const safeTitle = project.title
          .replace(/[^a-z0-9\s-]/gi, '')
          .replace(/\s+/g, '_')
          .substring(0, 50);
        const filename = `${safeTitle}_${new Date().toISOString().split('T')[0]}.docx`;

        // Send file
        return reply
          .type("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
          .header("Content-Disposition", `attachment; filename="${filename}"`)
          .header("Content-Length", String(buffer.length))
          .send(buffer);
          
      } catch (error) {
        request.log.error({ error, projectId }, "DOCX export failed");
        return sendError(
          reply, 
          "EXPORT_FAILED", 
          error instanceof Error ? error.message : "Failed to generate DOCX export",
          500
        );
      }
    }
  );
}
