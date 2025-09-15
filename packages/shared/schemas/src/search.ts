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

// Search pipeline schemas
export const QueryManifestSchema = z.object({
  projectId: UUIDSchema,
  userId: UUIDSchema,
  providers: z.array(z.object({
    name: z.string(),
    query: z.string(),
    config: z.any().optional()
  }))
}).strict();

export const ProviderRecordSchema = z.object({
  title: z.string(),
  year: z.number().int().optional(),
  doi: z.string().optional(),
  pmid: z.string().optional(),
  pmcid: z.string().optional(),
  source: z.string(),
  authors: z.array(z.any()).optional(),
  journal: z.string().optional(),
  volume: z.string().optional(),
  issue: z.string().optional(),
  pages: z.string().optional(),
  abstract: z.string().optional(),
  meshTerms: z.array(z.any()).optional(),
  rawPayload: z.any()
}).strict();

export const FlagsSchema = z.object({
  retracted: z.boolean().optional(),
  predatory: z.boolean().optional(),
  detectedAt: z.string().optional(),
  sources: z.array(z.string()).optional()
}).strict();

export const PrismaCountsSchema = z.object({
  identified: z.number().int().min(0),
  deduped: z.number().int().min(0),
  screened: z.number().int().min(0),
  included: z.number().int().min(0),
  excluded: z.number().int().min(0)
}).strict();

export const ExportPayloadSchema = z.object({
  projectId: UUIDSchema,
  format: z.enum(['markdown', 'bibtex', 'docx', 'json']),
  options: z.any().optional()
}).strict();

export type QueryManifest = z.infer<typeof QueryManifestSchema>;
export type ProviderRecord = z.infer<typeof ProviderRecordSchema>;
export type Flags = z.infer<typeof FlagsSchema>;
export type PrismaCounts = z.infer<typeof PrismaCountsSchema>;
export type ExportPayload = z.infer<typeof ExportPayloadSchema>;

// Search run status
export const SearchRunStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);
export type SearchRunStatus = z.infer<typeof SearchRunStatusSchema>;
