import type { FastifyInstance } from "fastify";

export async function registerLogging(app: FastifyInstance) {
  app.addHook("onResponse", async (req, reply) => {
    if (req.url?.startsWith("/api/v1/auth/") || req.url === "/api/v1/me") {
      app.log.info({
        id: req.id,
        ip: req.ip,
        ua: req.headers["user-agent"],
        url: req.url,
        status: reply.statusCode,
        user: (req as any).user?.id || null
      }, "auth_flow");
    }
  });
}

