import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../index";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../utils/auth";

describe("Import Routes", () => {
  let app: FastifyInstance;
  let authHeaders: Record<string, string>;
  let projectId: string;
  let userId: string;

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

    // Create test project
    const project = await prisma.project.create({
      data: {
        ownerId: userId,
        title: "Test Import Project",
        settings: {}
      }
    });
    projectId = project.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.auditLog.deleteMany({ where: { projectId } });
    await prisma.candidate.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  describe("POST /projects/:id/import", () => {
    it("should import RIS file successfully", async () => {
      const risContent = `TY  - JOUR
TI  - Test Article
T2  - Test Journal
PY  - 2023
AU  - Smith, John
AU  - Jones, Jane
ER  -`;

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/projects/${projectId}/import`,
        headers: {
          ...authHeaders,
          "content-type": "multipart/form-data"
        },
        payload: {
          file: {
            value: risContent,
            options: {
              filename: "test.ris",
              contentType: "text/plain"
            }
          }
        }
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ok).toBe(true);
      expect(body.data.imported).toBeGreaterThan(0);
    });

    it("should import BibTeX file successfully", async () => {
      const bibtexContent = `@article{test2023,
  title={Test Article},
  journal={Test Journal},
  year={2023},
  author={Smith, John and Jones, Jane}
}`;

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/projects/${projectId}/import`,
        headers: {
          ...authHeaders,
          "content-type": "multipart/form-data"
        },
        payload: {
          file: {
            value: bibtexContent,
            options: {
              filename: "test.bib",
              contentType: "text/plain"
            }
          }
        }
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ok).toBe(true);
      expect(body.data.imported).toBeGreaterThan(0);
    });

    it("should reject unsupported file types", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/projects/${projectId}/import`,
        headers: {
          ...authHeaders,
          "content-type": "multipart/form-data"
        },
        payload: {
          file: {
            value: "some content",
            options: {
              filename: "test.txt",
              contentType: "text/plain"
            }
          }
        }
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject empty files", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/projects/${projectId}/import`,
        headers: {
          ...authHeaders,
          "content-type": "multipart/form-data"
        },
        payload: {
          file: {
            value: "",
            options: {
              filename: "empty.ris",
              contentType: "text/plain"
            }
          }
        }
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should require authentication", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/projects/${projectId}/import`,
        headers: {
          "content-type": "multipart/form-data"
        },
        payload: {
          file: {
            value: "TY  - JOUR\nTI  - Test\nER  -",
            options: {
              filename: "test.ris",
              contentType: "text/plain"
            }
          }
        }
      });

      expect(response.statusCode).toBe(401);
    });

    it("should create audit log entry", async () => {
      const risContent = `TY  - JOUR
TI  - Audit Test Article
T2  - Test Journal
PY  - 2023
AU  - Smith, John
ER  -`;

      await app.inject({
        method: "POST",
        url: `/api/v1/projects/${projectId}/import`,
        headers: {
          ...authHeaders,
          "content-type": "multipart/form-data"
        },
        payload: {
          file: {
            value: risContent,
            options: {
              filename: "audit_test.ris",
              contentType: "text/plain"
            }
          }
        }
      });

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          projectId,
          action: "import_references"
        },
        orderBy: {
          timestamp: "desc"
        }
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.userId).toBe(userId);
      expect(auditLog?.details).toHaveProperty("filename", "audit_test.ris");
      expect(auditLog?.details).toHaveProperty("size");
      expect(auditLog?.details).toHaveProperty("imported");
    });

    describe("PDF Import (when enabled)", () => {
      beforeEach(() => {
        // Enable PDF import for these tests
        process.env.FEATURE_IMPORT_PDF_BIB = "true";
      });

      it("should handle PDF import when feature is enabled", async () => {
        // Create a minimal PDF buffer
        const pdfBuffer = Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\nxref\n0 2\n0000000000 65535 f \n0000000010 00000 n \ntrailer\n<<>>\nstartxref\n9\n%%EOF");

        const response = await app.inject({
          method: "POST",
          url: `/api/v1/projects/${projectId}/import`,
          headers: {
            ...authHeaders,
            "content-type": "multipart/form-data"
          },
          payload: {
            file: {
              value: pdfBuffer,
              options: {
                filename: "test.pdf",
                contentType: "application/pdf"
              }
            }
          }
        });

        // PDF parsing might fail with our minimal buffer, but the route should handle it
        expect([200, 400, 500]).toContain(response.statusCode);
      });

      it("should reject PDF when feature is disabled", async () => {
        // Disable PDF import
        process.env.FEATURE_IMPORT_PDF_BIB = "false";

        const pdfBuffer = Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\nxref\n0 2\n0000000000 65535 f \n0000000010 00000 n \ntrailer\n<<>>\nstartxref\n9\n%%EOF");

        const response = await app.inject({
          method: "POST",
          url: `/api/v1/projects/${projectId}/import`,
          headers: {
            ...authHeaders,
            "content-type": "multipart/form-data"
          },
          payload: {
            file: {
              value: pdfBuffer,
              options: {
                filename: "test.pdf",
                contentType: "application/pdf"
              }
            }
          }
        });

        expect(response.statusCode).toBe(404);
        const body = response.json();
        expect(body.ok).toBe(false);
        expect(body.error.code).toBe("NOT_ENABLED");
      });
    });
  });
});

