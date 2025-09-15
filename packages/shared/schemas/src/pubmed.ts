import { z } from "zod";

export const PubMedAuthorZ = z.object({
  family: z.string().optional(),
  given: z.string().optional(),
  full: z.string().optional()
});

export const PubMedArticleZ = z.object({
  pmid: z.string(),
  doi: z.string().optional(),
  title: z.string(),
  abstract: z.string().optional(),
  journal: z.string().optional(),
  year: z.number().int().optional(),
  authors: z.array(PubMedAuthorZ).default([])
});

export type PubMedAuthor = z.infer<typeof PubMedAuthorZ>;
export type PubMedArticle = z.infer<typeof PubMedArticleZ>;

// Search request schemas
export const PubMedSearchRequestZ = z.object({
  query: z.string().min(2).max(2000),
  limit: z.number().int().min(1).max(200).optional(),
  filters: z.object({
    mindate: z.string().regex(/^\d{4}(?:\/\d{2}\/\d{2})?$/).optional(),
    maxdate: z.string().regex(/^\d{4}(?:\/\d{2}\/\d{2})?$/).optional(),
    sort: z.enum(["relevance","pub_date"]).optional()
  }).optional()
});

export const PubMedImportRequestZ = z.object({ 
  pmids: z.array(z.string().regex(/^\d+$/)).min(1).max(500) 
});

export const PubMedDedupeRequestZ = z.object({ 
  pmids: z.array(z.string().regex(/^\d+$/)).min(1).max(1000), 
  dois: z.array(z.string()).optional() 
});

export const PubMedEnrichRequestZ = z.object({ 
  pmids: z.array(z.string().regex(/^\d+$/)).min(1).max(200) 
});

export type PubMedSearchRequest = z.infer<typeof PubMedSearchRequestZ>;
export type PubMedImportRequest = z.infer<typeof PubMedImportRequestZ>;
export type PubMedDedupeRequest = z.infer<typeof PubMedDedupeRequestZ>;
export type PubMedEnrichRequest = z.infer<typeof PubMedEnrichRequestZ>;

// Response schemas
export const PubMedSearchResponseZ = z.object({
  ok: z.literal(true),
  data: z.object({
    jobId: z.string()
  })
});

export const PubMedJobStatusZ = z.object({
  ok: z.literal(true),
  data: z.object({
    id: z.string(),
    state: z.enum(["waiting", "active", "completed", "failed", "delayed"]),
    progress: z.any(),
    result: z.any().nullable()
  })
});

export const PubMedDedupeResponseZ = z.object({
  ok: z.literal(true),
  data: z.object({
    existingPmids: z.array(z.string()),
    existingDois: z.array(z.string())
  })
});

export const PubMedImportResponseZ = z.object({
  ok: z.literal(true),
  data: z.object({
    imported: z.number(),
    skipped: z.number()
  })
});

export type PubMedSearchResponse = z.infer<typeof PubMedSearchResponseZ>;
export type PubMedJobStatus = z.infer<typeof PubMedJobStatusZ>;
export type PubMedDedupeResponse = z.infer<typeof PubMedDedupeResponseZ>;
export type PubMedImportResponse = z.infer<typeof PubMedImportResponseZ>;

