import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { FEATURE_PUBMED_SEARCH, FEATURE_PUBMED_IMPORT, FEATURE_PUBMED_EFETCH } from "../../config/pubmed";
import { pubmedSearchQueue } from "./search.queue";
import { cacheGetSummary } from "./cache";
import { authenticate, validateProjectOwnership } from "../../middleware/auth";
import { sendSuccess, sendError } from "../../utils/response";
import { prisma } from "../../lib/prisma";
import { 
  PubMedSearchRequestZ, 
  PubMedImportRequestZ, 
  PubMedDedupeRequestZ, 
  PubMedEnrichRequestZ 
} from "@the-scientist/schemas";

export default async function pubmedRoutes(app: FastifyInstance) {
  if (!FEATURE_PUBMED_SEARCH) return;

  // Add authentication and project ownership validation
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", validateProjectOwnership);

  // Start search job
  app.post("/api/v1/projects/:id/pubmed/search", async (req, reply) => {
    const { id: projectId } = req.params as any;
    const body = PubMedSearchRequestZ.parse(req.body ?? {});
    const userId = (req as any).user?.id || "unknown";

    const job = await pubmedSearchQueue.add("search", {
      projectId, userId, query: body.query, limit: body.limit ?? 50, filters: body.filters
    }, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: { type: "exponential", delay: 500 }
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        projectId,
        userId,
        action: "pubmed_search_start",
        details: {
          query: body.query,
          limit: body.limit ?? 50,
          filters: body.filters,
          jobId: job.id,
          timestamp: new Date().toISOString()
        }
      }
    });

    return sendSuccess(reply, { jobId: job.id });
  });

  // Job status
  app.get("/api/v1/projects/:id/pubmed/jobs/:jobId", async (req, reply) => {
    const { jobId } = req.params as any;
    const job = await pubmedSearchQueue.getJob(jobId);
    if (!job) return sendError(reply, "JOB_NOT_FOUND", "Job not found", 404);
    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue || null;
    return sendSuccess(reply, { id: job.id, state, progress, result });
  });

  // Ephemeral history
  app.get("/api/v1/projects/:id/pubmed/history", async (req, reply) => {
    const jobs = await pubmedSearchQueue.getJobs(["completed","failed","waiting","active","delayed"], 0, 20, true);
    const out = await Promise.all(jobs.map(async j => ({ 
      id: j.id, 
      state: await j.getState(), 
      timestamp: j.timestamp, 
      name: j.name, 
      query: (j.data as any)?.query 
    })));
    return sendSuccess(reply, out);
  });

  // Dedupe-check BEFORE import (mark existing items)
  app.post("/api/v1/projects/:id/pubmed/dedupe-check", async (req, reply) => {
    const { id: projectId } = req.params as any;
    const { pmids, dois } = PubMedDedupeRequestZ.parse(req.body ?? {});
    
    // Find existing candidates by PMID/DOI in this project
    const existingCandidates = await prisma.candidate.findMany({
      where: {
        projectId,
        OR: [
          { pmid: { in: pmids } },
          { doi: { in: dois || [] } }
        ]
      },
      select: { pmid: true, doi: true }
    });

    const existingPmids = existingCandidates
      .map(c => c.pmid)
      .filter(Boolean) as string[];
    
    const existingDois = existingCandidates
      .map(c => c.doi)
      .filter(Boolean) as string[];

    return sendSuccess(reply, { existingPmids, existingDois });
  });

  // Import selected results
  app.post("/api/v1/projects/:id/pubmed/jobs/:jobId/import", async (req, reply) => {
    if (!FEATURE_PUBMED_IMPORT) return sendError(reply, "IMPORT_DISABLED", "PubMed import is disabled", 404);
    
    const { id: projectId, jobId } = req.params as any;
    const { pmids } = PubMedImportRequestZ.parse(req.body ?? {});
    const userId = (req as any).user?.id;
    
    const job = await pubmedSearchQueue.getJob(jobId);
    if (!job) return sendError(reply, "JOB_NOT_FOUND", "Job not found", 404);

    const results = (job.returnvalue as any)?.results ?? [];
    const selected = results.filter((r: any) => pmids.includes(String(r.pmid)));

    if (selected.length === 0) {
      return sendError(reply, "NO_RESULTS", "No results found for selected PMIDs", 400);
    }

    // Convert PubMed articles to candidates and import
    const candidatesToCreate = selected.map((article: any) => ({
      projectId,
      title: article.title || "Unknown Title",
      journal: article.journal || "Unknown Journal",
      year: article.year || new Date().getFullYear(),
      authors: article.authors?.map((a: any) => a.full || `${a.family || ""} ${a.given || ""}`.trim()).filter(Boolean) || [],
      doi: article.doi,
      pmid: article.pmid,
      abstract: article.abstract,
      source: "pubmed_import"
    }));

    // Create candidates (skip duplicates)
    const { count: imported } = await prisma.candidate.createMany({
      data: candidatesToCreate,
      skipDuplicates: true
    });

    // Update PRISMA identified count
    await prisma.prismaData.upsert({
      where: { projectId },
      update: {
        identified: { increment: imported }
      },
      create: {
        projectId,
        identified: imported,
        deduped: 0,
        screened: 0,
        included: 0,
        excluded: 0
      }
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        projectId,
        userId,
        action: "pubmed_import_candidates",
        details: {
          jobId,
          selectedCount: selected.length,
          importedCount: imported,
          skippedCount: selected.length - imported,
          pmids,
          timestamp: new Date().toISOString()
        }
      }
    });

    return sendSuccess(reply, { imported, skipped: selected.length - imported });
  });

  // Optional: on-demand abstract enrichment via cache/EFetch (flagged)
  if (FEATURE_PUBMED_EFETCH) {
    app.post("/api/v1/projects/:id/pubmed/enrich", async (req, reply) => {
      const { pmids } = PubMedEnrichRequestZ.parse(req.body ?? {});
      // ADAPT: implement adapter.efetch(pmids) + cache store; merge into previews.
      // For now, return placeholder
      return sendSuccess(reply, { enriched: 0 });
    });
  }

  // Quick cache fetch (optional): return cached PubMed summaries by PMID
  app.post("/api/v1/projects/:id/pubmed/cache-lookup", async (req, reply) => {
    const { pmids } = PubMedImportRequestZ.parse(req.body ?? {});
    const items = await Promise.all(pmids.map(pmid => cacheGetSummary(pmid)));
    return sendSuccess(reply, { items });
  });
}
