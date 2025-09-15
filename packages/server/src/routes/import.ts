import { FastifyInstance } from 'fastify';
import { sendSuccess, sendError } from '../utils/response';
import { parseImportFile, validateNormalizedRefs, parseImportFileEnhanced } from '../modules/import/parser';
import { importReferences } from '../modules/import/importer';
import { IMPORT_CONFIG } from '../config/importConfig';
import { requireAuth, requireProjectAccess } from '../auth/middleware';

export async function importRoutes(fastify: FastifyInstance) {
  // Register multipart support
  await fastify.register(require('@fastify/multipart'), {
    limits: {
      fileSize: IMPORT_CONFIG.PDF_MAX_SIZE_MB * 1024 * 1024 // Use PDF max size limit
    }
  });

  // POST /api/v1/projects/:id/import
  fastify.post('/projects/:id/import', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      
      // Get the uploaded file
      const data = await (request as any).file();
      
      if (!data) {
        return sendError(reply, 'VALIDATION_ERROR', 'No file uploaded', 400);
      }
      
      const filename = data.filename || '';
      const extension = filename.toLowerCase().split('.').pop();
      const buffer = await data.toBuffer();
      const t0 = Date.now();

      // Check if PDF import is enabled
      if (extension === 'pdf' && !IMPORT_CONFIG.FEATURE_IMPORT_PDF_BIB) {
        return sendError(reply, 'NOT_ENABLED', 'PDF bibliography import disabled', 404);
      }

      // Check if DOCX import is enabled
      if (extension === 'docx' && !IMPORT_CONFIG.FEATURE_IMPORT_DOCX_BIB) {
        return sendError(reply, 'NOT_ENABLED', 'DOCX bibliography import disabled', 404);
      }

      // Check supported file types
      if (!['ris', 'bib', 'bibtex', 'pdf', 'docx'].includes(extension || '')) {
        return sendError(reply, 'VALIDATION_ERROR', 'Only .ris, .bib, .bibtex, .pdf, and .docx files are supported', 400);
      }

      let parsedRefs: any[];
      let metadata: any = {};

      if (extension === 'pdf' || extension === 'docx') {
        // Handle PDF/DOCX files with enhanced parser
        const result = await parseImportFileEnhanced({ 
          buffer, 
          filename, 
          mimetype: data.mimetype 
        });
        parsedRefs = result.refs;
        metadata = result.metadata;
      } else {
        // Handle text-based files (RIS/BibTeX)
        const content = buffer.toString('utf-8');
        
        if (!content.trim()) {
          return sendError(reply, 'VALIDATION_ERROR', 'File is empty', 400);
        }
        
        parsedRefs = parseImportFile(content, filename);
        metadata = { source: "text", format: extension };
      }
      
      if (parsedRefs.length === 0) {
        return sendError(reply, 'VALIDATION_ERROR', 'No valid references found in file', 400);
      }
      
      // Validate normalized references (only for complete refs)
      const validatedRefs = parsedRefs.filter(ref => {
        try {
          // Only validate complete references, skip partial ones from PDF
          if (ref.partial) return true;
          validateNormalizedRefs([ref]);
          return true;
        } catch {
          return false;
        }
      });
      
      // Import references
      const result = await importReferences(projectId, validatedRefs);
      
        // Create audit log
        const { prisma } = await import('../lib/prisma');
        const action = extension === 'pdf' ? "import_pdf_bib" : 
                      extension === 'docx' ? "import_docx_bib" : 
                      "import_references";
        await prisma.auditLog.create({
          data: {
            projectId,
            userId: (request as any).user?.id ?? "system",
            action,
            details: {
              filename,
              size: buffer.length,
              extracted: parsedRefs.length,
              imported: result.added,
              duplicates: result.duplicates,
              durationMs: Date.now() - t0,
              ...metadata
            }
          }
        });
      
      return sendSuccess(reply, {
        imported: result.added,
        duplicates: result.duplicates,
        metadata: metadata.confidence === 'low' ? { ...metadata, warning: "Low confidence extraction; prefer RIS/BibTeX for accuracy" } : metadata
      });
    } catch (error: any) {
      const code = error?.code ?? "IMPORT_FAILED";
      const msg =
        code === "ERR_PDF_TIMEOUT" ? "PDF parsing timed out" :
        code === "ERR_PDF_TOO_LARGE" ? "PDF exceeds allowed size" :
        code === "ERR_DOCX_TIMEOUT" ? "DOCX parsing timed out" :
        code === "ERR_DOCX_TOO_LARGE" ? "DOCX exceeds allowed size" :
        code === "ERR_DOC_UNSUPPORTED" ? "Legacy .doc is not supported. Please save as .docx." :
        code === "ERR_UNSUPPORTED_TYPE" ? "Unsupported file type" :
        error?.message ?? "Unknown error";
      
      request.log?.error({ error, projectId: (request.params as any).id }, "Import failed");
      return sendError(reply, 'IMPORT_ERROR', msg, 500);
    }
  });
}
