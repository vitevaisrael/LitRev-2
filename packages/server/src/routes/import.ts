import { FastifyInstance } from 'fastify';
import { sendSuccess, sendError } from '../utils/response';
import { parseImportFile, validateNormalizedRefs } from '../modules/import/parser';
import { importReferences } from '../modules/import/importer';

export async function importRoutes(fastify: FastifyInstance) {
  // Register multipart support
  await fastify.register(require('@fastify/multipart'), {
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    }
  });

  // POST /api/v1/projects/:id/import
  fastify.post('/projects/:id/import', async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      
      // Get the uploaded file
      const data = await (request as any).file();
      
      if (!data) {
        return sendError(reply, 'VALIDATION_ERROR', 'No file uploaded', 400);
      }
      
      // Check file type
      const filename = data.filename || '';
      const extension = filename.toLowerCase().split('.').pop();
      
      if (!['ris', 'bib', 'bibtex'].includes(extension || '')) {
        return sendError(reply, 'VALIDATION_ERROR', 'Only .ris, .bib, and .bibtex files are supported', 400);
      }
      
      // Read file content
      const buffer = await data.toBuffer();
      const content = buffer.toString('utf-8');
      
      if (!content.trim()) {
        return sendError(reply, 'VALIDATION_ERROR', 'File is empty', 400);
      }
      
      // Parse the file
      const parsedRefs = parseImportFile(content, filename);
      
      if (parsedRefs.length === 0) {
        return sendError(reply, 'VALIDATION_ERROR', 'No valid references found in file', 400);
      }
      
      // Validate normalized references
      const validatedRefs = validateNormalizedRefs(parsedRefs);
      
      // Import references
      const result = await importReferences(projectId, validatedRefs);
      
      return sendSuccess(reply, result);
    } catch (error) {
      if (error instanceof Error) {
        return sendError(reply, 'IMPORT_ERROR', error.message, 500);
      }
      return sendError(reply, 'IMPORT_ERROR', 'Failed to import references', 500);
    }
  });
}
