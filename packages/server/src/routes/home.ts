import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { sendSuccess } from "../utils/response";
import { requireAuth } from "../auth/middleware";

export default async function homeRoutes(app: FastifyInstance) {
  // GET /api/v1/projects/recent?limit=8
  app.get("/api/v1/projects/recent", { preHandler: requireAuth }, async (request, reply) => {
    try {
      const q = request.query as any;
      const limit = Math.min(Math.max(parseInt(q?.limit ?? "8", 10) || 8, 1), 50);

      const projects = await prisma.project.findMany({
        take: limit,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        select: { id: true, title: true, updatedAt: true, createdAt: true }
      });

      return sendSuccess(reply, {
        projects: projects.map(p => ({
          id: String(p.id),
          title: String(p.title ?? "Untitled"),
          updatedAt: (p.updatedAt ?? p.createdAt).toISOString()
        }))
      });
    } catch {
      return sendSuccess(reply, { projects: [] });
    }
  });

  // GET /api/v1/activity?limit=10
  app.get("/api/v1/activity", { preHandler: requireAuth }, async (request, reply) => {
    try {
      const q = request.query as any;
      const limit = Math.min(Math.max(parseInt(q?.limit ?? "10", 10) || 10, 1), 100);

      let logs: Array<{ id: any; action?: any; timestamp?: any; details?: any }> = [];
      try {
        logs = await prisma.auditLog.findMany({
          take: limit,
          orderBy: [{ timestamp: "desc" }],
          select: { id: true, action: true, timestamp: true, details: true }
        });
      } catch {
        logs = [];
      }

      const items = logs.map((x, i) => {
        const action = String(x.action ?? "");
        const low = action.toLowerCase();
        const kind =
          low.includes("export") ? "export" :
          low.includes("import") ? "import" :
          low.includes("job")    ? "job"    :
          low.includes("audit")  ? "audit"  : "other";

        const at =
          x.timestamp instanceof Date ? x.timestamp.toISOString() :
          x.timestamp ? String(x.timestamp) : new Date().toISOString();

        return {
          id: String(x.id ?? `a${i}`),
          kind,
          title: action || "Activity",
          at,
          meta: x.details ?? undefined,
        };
      });

      return sendSuccess(reply, { items });
    } catch {
      return sendSuccess(reply, { items: [] });
    }
  });
}
