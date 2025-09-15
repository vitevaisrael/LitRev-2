import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify from "fastify";
import pubmedRoutes from "./routes";
import { FEATURE_PUBMED_SEARCH, FEATURE_PUBMED_IMPORT, FEATURE_PUBMED_EFETCH } from "../../config/pubmed";

// Mock dependencies
vi.mock("../../config/pubmed", () => ({
  FEATURE_PUBMED_SEARCH: true,
  FEATURE_PUBMED_IMPORT: true,
  FEATURE_PUBMED_EFETCH: false
}));

vi.mock("./search.queue", () => ({
  pubmedSearchQueue: {
    add: vi.fn(),
    getJob: vi.fn(),
    getJobs: vi.fn()
  }
}));

vi.mock("./cache", () => ({
  cacheGetSummary: vi.fn()
}));

vi.mock("../../middleware/auth", () => ({
  authenticate: vi.fn((req, reply, done) => {
    (req as any).user = { id: "test-user", email: "test@example.com" };
    done();
  }),
  validateProjectOwnership: vi.fn((req, reply, done) => {
    (req as any).project = { id: "test-project", ownerId: "test-user" };
    done();
  })
}));

vi.mock("../../utils/response", () => ({
  sendSuccess: vi.fn((reply, data) => reply.send({ ok: true, data })),
  sendError: vi.fn((reply, code, message, status) => reply.code(status).send({ ok: false, error: { code, message } }))
}));

vi.mock("../../lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn()
    },
    candidate: {
      findMany: vi.fn(),
      createMany: vi.fn()
    },
    prismaData: {
      upsert: vi.fn()
    }
  }
}));

describe("PubMed Routes", () => {
  let app: any;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await app.register(pubmedRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /api/v1/projects/:id/pubmed/search", () => {
    it("should start a search job", async () => {
      const { pubmedSearchQueue } = await import("./search.queue");
      const mockJob = { id: "test-job-1" };
      vi.mocked(pubmedSearchQueue.add).mockResolvedValue(mockJob);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/projects/test-project/pubmed/search",
        payload: {
          query: "test query",
          limit: 50
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        ok: true,
        data: { jobId: "test-job-1" }
      });
      expect(pubmedSearchQueue.add).toHaveBeenCalledWith("search", {
        projectId: "test-project",
        userId: "test-user",
        query: "test query",
        limit: 50,
        filters: undefined
      }, expect.any(Object));
    });

    it("should validate request body", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/projects/test-project/pubmed/search",
        payload: {
          query: "", // Invalid: too short
          limit: 50
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /api/v1/projects/:id/pubmed/jobs/:jobId", () => {
    it("should return job status", async () => {
      const { pubmedSearchQueue } = await import("./search.queue");
      const mockJob = {
        id: "test-job-1",
        getState: vi.fn().mockResolvedValue("completed"),
        progress: { step: "completed", pct: 100 },
        returnvalue: { totalFound: 2, results: [] }
      };
      vi.mocked(pubmedSearchQueue.getJob).mockResolvedValue(mockJob);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/projects/test-project/pubmed/jobs/test-job-1"
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        ok: true,
        data: {
          id: "test-job-1",
          state: "completed",
          progress: { step: "completed", pct: 100 },
          result: { totalFound: 2, results: [] }
        }
      });
    });

    it("should return 404 for non-existent job", async () => {
      const { pubmedSearchQueue } = await import("./search.queue");
      vi.mocked(pubmedSearchQueue.getJob).mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/projects/test-project/pubmed/jobs/non-existent"
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("GET /api/v1/projects/:id/pubmed/history", () => {
    it("should return job history", async () => {
      const { pubmedSearchQueue } = await import("./search.queue");
      const mockJobs = [
        {
          id: "job-1",
          getState: vi.fn().mockResolvedValue("completed"),
          timestamp: 1234567890,
          name: "search",
          data: { query: "test query" }
        }
      ];
      vi.mocked(pubmedSearchQueue.getJobs).mockResolvedValue(mockJobs);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/projects/test-project/pubmed/history"
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        ok: true,
        data: [{
          id: "job-1",
          state: "completed",
          timestamp: 1234567890,
          name: "search",
          query: "test query"
        }]
      });
    });
  });

  describe("POST /api/v1/projects/:id/pubmed/dedupe-check", () => {
    it("should check for duplicates", async () => {
      const { prisma } = await import("../../lib/prisma");
      vi.mocked(prisma.candidate.findMany).mockResolvedValue([
        { pmid: "12345678", doi: null },
        { pmid: null, doi: "10.1000/test" }
      ]);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/projects/test-project/pubmed/dedupe-check",
        payload: {
          pmids: ["12345678", "87654321"],
          dois: ["10.1000/test", "10.1000/other"]
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        ok: true,
        data: {
          existingPmids: ["12345678"],
          existingDois: ["10.1000/test"]
        }
      });
    });
  });

  describe("POST /api/v1/projects/:id/pubmed/jobs/:jobId/import", () => {
    it("should import selected results", async () => {
      const { pubmedSearchQueue } = await import("./search.queue");
      const { prisma } = await import("../../lib/prisma");
      
      const mockJob = {
        returnvalue: {
          results: [
            { pmid: "12345678", title: "Test Article", journal: "Test Journal", year: 2023, authors: [], doi: "10.1000/test" }
          ]
        }
      };
      vi.mocked(pubmedSearchQueue.getJob).mockResolvedValue(mockJob);
      vi.mocked(prisma.candidate.createMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.prismaData.upsert).mockResolvedValue({});

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/projects/test-project/pubmed/jobs/test-job-1/import",
        payload: {
          pmids: ["12345678"]
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        ok: true,
        data: { imported: 1, skipped: 0 }
      });
    });

    it("should return 404 when import is disabled", async () => {
      vi.mocked(FEATURE_PUBMED_IMPORT).mockReturnValue(false);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/projects/test-project/pubmed/jobs/test-job-1/import",
        payload: { pmids: ["12345678"] }
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /api/v1/projects/:id/pubmed/cache-lookup", () => {
    it("should return cached summaries", async () => {
      const { cacheGetSummary } = await import("./cache");
      vi.mocked(cacheGetSummary)
        .mockResolvedValueOnce({ pmid: "12345678", title: "Cached Article" })
        .mockResolvedValueOnce(null);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/projects/test-project/pubmed/cache-lookup",
        payload: {
          pmids: ["12345678", "87654321"]
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        ok: true,
        data: {
          items: [
            { pmid: "12345678", title: "Cached Article" },
            null
          ]
        }
      });
    });
  });
});

