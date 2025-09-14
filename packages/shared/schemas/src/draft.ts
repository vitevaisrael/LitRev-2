import { z } from 'zod';
import { UUIDSchema, TimestampSchema } from './common';

export const DraftSchema = z.object({
  id: UUIDSchema,
  projectId: UUIDSchema,
  section: z.string(),
  content: z.string(),
  citations: z.array(z.object({
    offset: z.number().int(),
    length: z.number().int(),
    candidateId: UUIDSchema
  })).optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
}).strict();

export const SuggestCitationsSchema = z.object({
  section: z.string(),
  text: z.string()
}).strict();

export const TightenSchema = z.object({
  section: z.string(),
  text: z.string()
}).strict();

export const CoverageSchema = z.object({
  section: z.string(),
  text: z.string()
}).strict();

export type Draft = z.infer<typeof DraftSchema>;
export type SuggestCitations = z.infer<typeof SuggestCitationsSchema>;
export type Tighten = z.infer<typeof TightenSchema>;
export type Coverage = z.infer<typeof CoverageSchema>;
