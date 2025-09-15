import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../utils/auth.js";

describe("Export Routes", () => {
  let app: FastifyInstance;
  let authHeaders: Record<string, string>;
  let projectId: string;
  let userId: string;
  let claimId: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    
    // Create test user
    const passwordHash = await hashPassword("testpass123");
    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        passwordHash,
        name: "Test User"
      }
    });
    userId = user.id;

    // Login to get auth token
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "test@example.com",
        password: "testpass123"
      }
    });
    const cookies = loginRes.headers["set-cookie"];
    authHeaders = { cookie: cookies as string };

    // Create test project with comprehensive data
    const project = await prisma.project.create({
      data: {
        ownerId: userId,
        title: "Test Medical Review Project",
        settings: { preferOA: true }
      }
    });
    projectId = project.id;

    // Add problem profile
    await prisma.problemProfile.create({
      data: {
        projectId,
        version: "1.0",
        population: { description: "Adults with chronic kidney disease" },
        intervention: { description: "Corticosteroid therapy" },
        comparator: { description: "Placebo or standard care" },
        outcomes: { primary: "Kidney function", secondary: "Proteinuria" },
        timeframe: { from: 2010, to: 2024 },
        mesh: ["Kidney Diseases", "Steroids"],
        include: ["RCT", "Systematic Review"],
        exclude: ["Case reports"],
        notes: "Focus on long-term outcomes"
      }
    });

    // Add PRISMA data
    await prisma.prismaData.create({
      data: {
        projectId,
        identified: 150,
        duplicates: 25,
        screened: 125,
        included: 12,
        excluded: 113
      }
    });

    // Add draft sections
    await prisma.draft.createMany({
      data: [
        {
          projectId,
          section: "Introduction",
          content: "Chronic kidney disease affects millions worldwide.\n\nThis review examines corticosteroid efficacy."
        },
        {
          projectId,
          section: "Methods",
          content: "Systematic search of PubMed and Cochrane databases."
        }
      ]
    });

    // Add candidates
    const candidate = await prisma.candidate.create({
      data: {
        projectId,
        title: "Corticosteroids in IgA Nephropathy: A Randomized Trial",
        journal: "New England Journal of Medicine",
        year: 2023,
        authors: ["Smith J", "Jones K", "Brown L", "Davis M"],
        doi: "10.1056/NEJMoa2023",
        pmid: "37123456",
        abstract: "A multicenter randomized controlled trial..."
      }
    });

    // Add decision
    await prisma.decision.create({
      data: {
        projectId,
        candidateId: candidate.id,
        action: "include",
        reason: "High-quality RCT",
        stage: "full_text",
        userId,
        justification: "Meets all inclusion criteria"
      }
    });

    // Add claim and support
    const claim = await prisma.claim.create({
      data: {
        projectId,
        text: "Corticosteroids reduce proteinuria in IgA nephropathy",
        section: "Results"
      }
    });
    claimId = claim.id;

    await prisma.support.create({
      data: {
        projectId,
        claimId,
        candidateId: candidate.id,
        quote: "Proteinuria decreased by 50% in the treatment group",
        locator: { page: 5, sentence: 12 },
        evidenceType: "quantitative"
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.auditLog.deleteMany({ where: { projectId } });
    await prisma.support.deleteMany({ where: { projectId } });
    await prisma.claim.deleteMany({ where: { projectId } });
    await prisma.decision.deleteMany({ where: { projectId } });
    await prisma.candidate.deleteMany({ where: { projectId } });
    await prisma.draft.deleteMany({ where: { projectId } });
    await prisma.prismaData.deleteMany({ where: { projectId } });
    await prisma.problemProfile.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    
    await app.close();
  });

  describe("POST /projects/:id/exports/docx", () => {
    it("should export DOCX with all options enabled", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/projects/${projectId}/exports/docx`,
        headers: authHeaders,
        payload: {
          includeSupports: true,
          includePrisma: true,
          includeProfile: true,
          format: "academic"
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("wordprocessingml.document");
      expect(response.headers["content-disposition"]).toMatch(/attachment.*\.docx/);
      expect(response.headers["content-length"]).toBeDefined();
      expect(response.rawPayload.length).toBeGreaterThan(1000);
    });

    it("should export minimal DOCX with options disabled", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/projects/${projectId}/exports/docx`,
        headers: authHeaders,
        payload: {
          includeSupports: false,
          includePrisma: false,
          includeProfile: false,
          format: "summary"
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.rawPayload.length).toBeGreaterThan(0);
    });

    it("should create audit log entry", async () => {
      await app.inject({
        method: "POST",
        url: `/api/v1/projects/${projectId}/exports/docx`,
        headers: authHeaders,
        payload: {}
      });

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          projectId,
          action: "export_docx"
        },
        orderBy: {
          timestamp: "desc"
        }
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.userId).toBe(userId);
      expect(auditLog?.details).toHaveProperty("size");
      expect(auditLog?.details).toHaveProperty("format");
    });

    it("should return 404 for non-existent project", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/projects/00000000-0000-0000-0000-000000000000/exports/docx`,
        headers: authHeaders,
        payload: {}
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("PROJECT_NOT_FOUND");
    });

    it("should require authentication", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/projects/${projectId}/exports/docx`,
        payload: {}
      });

      expect(response.statusCode).toBe(401);
    });

    it("should validate request body", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/projects/${projectId}/exports/docx`,
        headers: authHeaders,
        payload: {
          format: "invalid-format"
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });
});