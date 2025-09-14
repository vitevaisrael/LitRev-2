import { z } from 'zod';
import { UUIDSchema, DOISchema, PMIDSchema, TimestampSchema } from './common';

export const ExplorerRunSchema = z.object({
  runId: UUIDSchema,
  projectId: UUIDSchema,
  prompt: z.string(),
  model: z.string(),
  output: z.object({
    outline: z.array(z.string()).optional(),
    narrative: z.array(z.object({
      section: z.string(),
      text: z.string(),
      refs: z.array(z.object({
        doi: DOISchema.optional(),
        pmid: PMIDSchema.optional()
      }))
    })).optional(),
    refs: z.array(z.object({
      title: z.string(),
      doi: DOISchema.optional(),
      pmid: PMIDSchema.optional(),
      journal: z.string(),
      year: z.number().int()
    }))
  }),
  createdAt: TimestampSchema
}).strict();

export const ImportRefsSchema = z.object({
  runId: UUIDSchema,
  refs: z.array(z.object({
    doi: DOISchema.optional(),
    pmid: PMIDSchema.optional(),
    title: z.string().optional(),
    journal: z.string().optional(),
    year: z.number().int().optional()
  }))
}).strict();

export type ExplorerRun = z.infer<typeof ExplorerRunSchema>;
export type ImportRefs = z.infer<typeof ImportRefsSchema>;
