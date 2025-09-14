import { z } from 'zod';

// Draft section schema
export const DraftSectionSchema = z.object({
  section: z.string().min(1),
  content: z.string(),
  citations: z.array(z.string().uuid()).optional()
}).strict();

// Draft response schema
export const DraftResponseSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  section: z.string(),
  content: z.string(),
  citations: z.array(z.string().uuid()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).strict();

// Draft list response schema
export const DraftListResponseSchema = z.object({
  sections: z.array(DraftResponseSchema)
}).strict();