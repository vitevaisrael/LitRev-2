import type { FastifyRequest, FastifyReply } from "fastify";
import { ENV } from "../config/auth";
import { prisma } from "../lib/prisma";

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    const token = req.cookies?.[ENV.AUTH_COOKIE_NAME];
    if (!token) return reply.code(401).send({ ok: false, error: "UNAUTHENTICATED" });
    const decoded = await req.server.jwt.verify(token, { secret: ENV.JWT_ACCESS_SECRET as any });
    req.user = decoded as any;
  } catch {
    return reply.code(401).send({ ok: false, error: "UNAUTHENTICATED" });
  }
}

export async function requireProjectAccess(req: FastifyRequest, reply: FastifyReply) {
  const p = (req.params as any) || {};
  const projectId = p.id || p.projectId;
  if (!projectId) return reply.code(400).send({ ok: false, error: "PROJECT_ID_REQUIRED" });
  if (!req.user?.id) return reply.code(401).send({ ok: false, error: "UNAUTHENTICATED" });
  
  // Check if project exists and user owns it
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: req.user.id
    }
  });
  
  if (!project) {
    return reply.code(404).send({ ok: false, error: "PROJECT_NOT_FOUND" });
  }
  
  // Attach project to request for use in route handlers
  (req as any).project = project;
}

