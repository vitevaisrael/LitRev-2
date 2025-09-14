import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response';

const prisma = new PrismaClient();

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
      
      // Get PRISMA data
      const prismaData = await prisma.prismaData.findUnique({
        where: { projectId }
      });
      
      if (!prismaData) {
        return sendError(reply, 'NOT_FOUND', 'PRISMA data not found', 404);
      }
      
      // Generate PRISMA SVG (simplified version)
      const svg = generatePrismaSvg(prismaData);
      
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
        claims: claims.map(claim => ({
          id: claim.id,
          statement: (claim as any).statement,
          supports: claim.supports.map(support => ({
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
}

// Helper function to generate PRISMA SVG
function generatePrismaSvg(prismaData: any): string {
  const { identified, screened, assessed, included } = prismaData;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="300" fill="white"/>
  
  <!-- Title -->
  <text x="200" y="30" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">PRISMA Flow Diagram</text>
  
  <!-- Boxes -->
  <rect x="150" y="60" width="100" height="40" fill="#e1f5fe" stroke="#01579b" stroke-width="2"/>
  <text x="200" y="85" text-anchor="middle" font-family="Arial" font-size="12">Records identified: ${identified}</text>
  
  <rect x="150" y="120" width="100" height="40" fill="#e8f5e8" stroke="#2e7d32" stroke-width="2"/>
  <text x="200" y="145" text-anchor="middle" font-family="Arial" font-size="12">Records screened: ${screened}</text>
  
  <rect x="150" y="180" width="100" height="40" fill="#fff3e0" stroke="#ef6c00" stroke-width="2"/>
  <text x="200" y="205" text-anchor="middle" font-family="Arial" font-size="12">Full-text assessed: ${assessed}</text>
  
  <rect x="150" y="240" width="100" height="40" fill="#f3e5f5" stroke="#7b1fa2" stroke-width="2"/>
  <text x="200" y="265" text-anchor="middle" font-family="Arial" font-size="12">Studies included: ${included}</text>
  
  <!-- Arrows -->
  <path d="M 200 100 L 200 120" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)"/>
  <path d="M 200 160 L 200 180" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)"/>
  <path d="M 200 220 L 200 240" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)"/>
  
  <!-- Arrow marker -->
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#333"/>
    </marker>
  </defs>
</svg>`;
}
