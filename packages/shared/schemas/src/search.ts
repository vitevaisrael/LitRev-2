import { z } from 'zod';
import { UUIDSchema, DOISchema, PMIDSchema, TimestampSchema } from './common';

export const CandidateSchema = z.object({
  id: UUIDSchema,
  projectId: UUIDSchema,
  doi: DOISchema.optional(),
  pmid: PMIDSchema.optional(),
  title: z.string(),
  journal: z.string(),
  year: z.number().int(),
  authors: z.any().optional(), // Json
  abstract: z.string().optional(),
  links: z.object({
    oaUrl: z.string().url().optional(),
    publisherUrl: z.string().url().optional(),
    pubmedUrl: z.string().url().optional()
  }).optional(),
  flags: z.object({
    retracted: z.boolean().optional(),
    predatory: z.boolean().optional()
  }).optional(),
  score: z.object({
    design: z.number().min(0).max(40),
    directness: z.number().min(0).max(10),
    recency: z.number().min(0).max(5),
    journal: z.number().min(0).max(5),
    total: z.number().min(0).max(65)
  }).optional(),
  createdAt: TimestampSchema
}).strict();

export type Candidate = z.infer<typeof CandidateSchema>;
