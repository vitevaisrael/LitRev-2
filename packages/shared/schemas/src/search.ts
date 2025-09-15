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

// Provider record types for search pipeline
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

export type ProviderRecord = z.infer<typeof ProviderRecordSchema>;

export const CanonicalRecordSchema = ProviderRecordSchema.extend({
  canonicalHash: z.string(),
  mergedSources: z.array(z.string()).optional()
}).strict();

export type CanonicalRecord = z.infer<typeof CanonicalRecordSchema>;

export const QueryManifestSchema = z.object({
  terms: z.array(z.string()),
  booleanLogic: z.string().optional(),
  filters: z.record(z.any()).optional(),
  dateRange: z.object({
    from: z.string().optional(),
    to: z.string().optional()
  }).optional(),
  sources: z.array(z.string()).optional()
}).strict();

export type QueryManifest = z.infer<typeof QueryManifestSchema>;

export const FlagsSchema = z.object({
  retracted: z.boolean().optional(),
  predatory: z.boolean().optional(),
  notes: z.string().optional(),
  detectedAt: z.string().optional(),
  sources: z.array(z.string()).optional()
}).strict();

export type Flags = z.infer<typeof FlagsSchema>;

export const PrismaCountsSchema = z.object({
  identified: z.number().int(),
  deduped: z.number().int(),
  screenedIn: z.number().int(),
  excluded: z.record(z.number().int()),
  included: z.number().int()
}).strict();

export type PrismaCounts = z.infer<typeof PrismaCountsSchema>;

export const ExportPayloadSchema = z.object({
  projectId: UUIDSchema,
  includeAppendix: z.boolean().optional(),
  includePrisma: z.boolean().optional()
}).strict();

export type ExportPayload = z.infer<typeof ExportPayloadSchema>;
