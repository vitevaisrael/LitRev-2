import { z } from 'zod';

// PDF upload response
export const PdfUploadResponseSchema = z.object({
  parsed: z.boolean(),
  pageCount: z.number().int().min(0),
  sentenceCount: z.number().int().min(0)
}).strict();

// Parsed document structure
export const ParsedDocSchema = z.object({
  pages: z.array(z.object({
    page: z.number().int().min(1),
    sentences: z.array(z.object({
      idx: z.number().int().min(1),
      text: z.string()
    }))
  }))
}).strict();

// ParsedDoc response
export const ParsedDocResponseSchema = z.object({
  id: z.string().uuid(),
  candidateId: z.string().uuid(),
  storageKey: z.string(),
  textJson: ParsedDocSchema,
  createdAt: z.string().datetime()
}).strict();
