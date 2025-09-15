import { z } from 'zod';

export const ExplorerResponseSchema = z.object({
  outline: z.array(z.string()).optional(),
  narrative: z.array(z.object({
    section: z.string(),
    text: z.string(),
    refs: z.array(z.object({
      doi: z.string().optional(),
      pmid: z.string().optional()
    })).optional()
  })).optional(),
  refs: z.array(z.object({
    title: z.string(),
    doi: z.string().optional(),
    pmid: z.string().optional(),
    journal: z.string(),
    year: z.number().int()
  })).optional()
}).strict();
