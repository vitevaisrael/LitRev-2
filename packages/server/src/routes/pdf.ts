import { FastifyInstance } from 'fastify';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../lib/prisma';
import { uploadFile } from '../modules/storage/s3';
import { parsePdf } from '../modules/ingest/parser';
import { PdfUploadResponseSchema, ParsedDocResponseSchema } from '@the-scientist/schemas';
import { env } from '../config/env';

export async function pdfRoutes(fastify: FastifyInstance) {
  // Register multipart support (if not already registered)
  try {
    await fastify.register(require('@fastify/multipart'), {
      limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit for PDFs
      }
    });
  } catch (error) {
    // Multipart already registered, ignore
  }

  // POST /api/v1/projects/:id/candidates/:cid/pdf
  fastify.post('/projects/:id/candidates/:cid/pdf', async (request, reply) => {
    try {
      const { id: projectId, cid: candidateId } = request.params as { id: string; cid: string };
      
      // Get the uploaded file
      const data = await (request as any).file();
      
      if (!data) {
        return sendError(reply, 'VALIDATION_ERROR', 'No file uploaded', 400);
      }
      
      // Check file type
      const filename = data.filename || '';
      const extension = filename.toLowerCase().split('.').pop();
      
      if (extension !== 'pdf') {
        return sendError(reply, 'VALIDATION_ERROR', 'Only PDF files are supported', 400);
      }
      
      // Verify candidate exists and belongs to project
      const candidate = await prisma.candidate.findFirst({
        where: { 
          id: candidateId,
          projectId 
        }
      });
      
      if (!candidate) {
        return sendError(reply, 'NOT_FOUND', 'Candidate not found', 404);
      }
      
      // Read file content
      const buffer = await data.toBuffer();
      
      // Upload to S3
      const storageKey = `projects/${projectId}/candidates/${candidateId}.pdf`;
      await uploadFile(env.S3_BUCKET, storageKey, buffer, 'application/pdf');
      
      // Parse PDF
      const parsedDoc = await parsePdf(buffer);
      
      // Count pages and sentences
      const pageCount = parsedDoc.pages.length;
      const sentenceCount = parsedDoc.pages.reduce((total, page) => total + page.sentences.length, 0);
      
      // Upsert ParsedDoc
      await prisma.parsedDoc.upsert({
        where: { candidateId },
        update: {
          storageKey,
          textJson: parsedDoc as any
        },
        create: {
          projectId,
          candidateId,
          storageKey,
          textJson: parsedDoc as any
        }
      });
      
      // Create audit log
      await prisma.auditLog.create({
        data: {
          projectId,
          userId: candidate.projectId, // Using projectId as userId for now
          action: 'pdf_attached',
          details: {
            candidateId,
            pageCount,
            sentenceCount,
            filename
          }
        }
      });
      
      const result = {
        parsed: true,
        pageCount,
        sentenceCount
      };
      
      // Validate response
      const validatedResult = PdfUploadResponseSchema.parse(result);
      
      return sendSuccess(reply, validatedResult);
    } catch (error) {
      if (error instanceof Error) {
        return sendError(reply, 'PDF_ERROR', error.message, 500);
      }
      return sendError(reply, 'PDF_ERROR', 'Failed to process PDF', 500);
    }
  });

  // GET /api/v1/projects/:id/candidates/:cid/parsed
  fastify.get('/projects/:id/candidates/:cid/parsed', async (request, reply) => {
    try {
      const { id: projectId, cid: candidateId } = request.params as { id: string; cid: string };
      
      // Verify candidate exists and belongs to project
      const candidate = await prisma.candidate.findFirst({
        where: { 
          id: candidateId,
          projectId 
        }
      });
      
      if (!candidate) {
        return sendError(reply, 'NOT_FOUND', 'Candidate not found', 404);
      }
      
      // Get ParsedDoc
      const parsedDoc = await prisma.parsedDoc.findUnique({
        where: { candidateId }
      });
      
      if (!parsedDoc) {
        return sendError(reply, 'NOT_FOUND', 'No parsed document found for this candidate', 404);
      }
      
      const result = {
        id: parsedDoc.id,
        candidateId: parsedDoc.candidateId,
        storageKey: parsedDoc.storageKey,
        textJson: parsedDoc.textJson,
        createdAt: parsedDoc.createdAt.toISOString()
      };
      
      // Validate response
      const validatedResult = ParsedDocResponseSchema.parse(result);
      
      return sendSuccess(reply, validatedResult);
    } catch (error) {
      if (error instanceof Error) {
        return sendError(reply, 'PDF_ERROR', error.message, 500);
      }
      return sendError(reply, 'PDF_ERROR', 'Failed to retrieve parsed document', 500);
    }
  });
}
