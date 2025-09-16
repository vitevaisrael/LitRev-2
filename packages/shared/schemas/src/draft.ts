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

// ============================================================================
// Draft Enhancement Schemas (auto-added by task)
// ============================================================================

export const SuggestCitationsRequestSchema = z.object({
  section: z.string().min(1),
  text: z.string().min(1)
}).strict();

export const TightenRequestSchema = z.object({
  section: z.string().min(1),
  text: z.string().min(1)
}).strict();

export const CoverageRequestSchema = z.object({
  section: z.string().min(1),
  text: z.string().min(1)
}).strict();

export const CitationSuggestionSchema = z.object({
  supportId: z.string().uuid(),
  quote: z.string(),
  relevance: z.number().min(0).max(1),
  reason: z.string().optional()
}).strict();

export const SuggestCitationsResponseSchema = z.object({
  suggestions: z.array(CitationSuggestionSchema),
  analysisNote: z.string().optional()
}).strict();

export const TightenResponseSchema = z.object({
  improvedText: z.string(),
  changes: z.array(z.string()).optional()
}).strict();

export const CoverageResponseSchema = z.object({
  score: z.number().min(0).max(1),
  citedClaims: z.number().int().min(0),
  totalClaims: z.number().int().min(0),
  gaps: z.array(z.object({
    text: z.string(),
    position: z.number().int().optional()
  })).optional(),
  suggestions: z.array(z.string()).optional()
}).strict();