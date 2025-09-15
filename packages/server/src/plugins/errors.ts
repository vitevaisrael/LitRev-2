import type { FastifyInstance } from "fastify";

export async function registerErrors(app: FastifyInstance) {
  app.setErrorHandler((err, _req, reply) => {
    const code = (err as any)?.code;
    const status = (err as any)?.statusCode || 500;
    const known = typeof code === "string" ? code : (status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : "INTERNAL_ERROR");
    reply.status(status).send({ ok: false, error: known });
  });
}

