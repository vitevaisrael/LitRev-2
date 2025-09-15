import { FastifyRequest } from 'fastify';

// API Response types
export type ApiResponse<T> = 
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

// Authenticated request type
export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
  };
}

// Job status types
export interface JobStatusUpdate {
  step: string;
  count: number;
  total: number;
  runId?: string;
  [key: string]: any; // Allow additional properties for Prisma
}

// Search result types
export interface SearchResult {
  pmid?: string;
  title: string;
  journal: string;
  year: number;
  authors: string[];
  abstract?: string;
}

// Explorer output types
export interface ExplorerOutput {
  outline?: string;
  narrative?: string;
  refs: SearchResult[];
}

// Search metadata types
export interface SearchMetadata {
  query?: string;
  filters?: Record<string, any>;
  totalResults?: number;
  processedAt?: string;
  providerStats?: Record<string, any>;
  dedupeStats?: Record<string, any>;
}

// Search run filter types
export interface SearchRunFilter {
  status?: string;
  savedSearchId?: string;
  dateFrom?: string;
  dateTo?: string;
}
