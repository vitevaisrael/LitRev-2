import type { FastifyInstance } from "fastify";
import { sendSuccess } from "../utils/response";
import { requireAuth } from "../auth/middleware";
import { auditLog } from "../utils/audit";

type ChatRole = "system" | "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string; ts?: string };

function isChatMessage(x: any): x is ChatMessage {
  return !!x && typeof x === "object" && typeof x.content === "string" &&
    (x.role === "system" || x.role === "user" || x.role === "assistant");
}

export default async function aiRoutes(app: FastifyInstance) {
  // Absolute path to avoid double prefixes
  app.post("/api/v1/ai/chat", { preHandler: requireAuth }, async (request, reply) => {
    try {
      const body = (request as any).body ?? {};
      const list = Array.isArray(body?.messages) ? body.messages : [];
      const messages: ChatMessage[] = list.filter(isChatMessage);

      // Demo assistant reply (non-streaming)
      const now = new Date().toISOString();
      const lastUser = [...messages].reverse().find(m => m.role === "user");
      const prompt = lastUser?.content?.trim() || "";

      const tips = [
        "I can draft search strings, outline PICOS, or summarize findings.",
        "Ask me to scaffold a PRISMA flow or propose inclusion/exclusion rules."
      ].join(" ");

      const content = prompt
        ? `Server demo reply:\n\n• Your request: ${prompt}\n• Next steps: ${tips}`
        : `Server demo is ready. ${tips}`;

      const replyMsg: ChatMessage = { role: "assistant", content, ts: now };

      // Best-effort audit (console if 'system'; no DB writes)
      try {
        const userId = (request as any).user?.id || "anonymous";
        await auditLog("system", userId, "home_ai_chat", { len: messages.length, hasPrompt: !!prompt });
      } catch { /* ignore */ }

      return sendSuccess(reply, { messages: [replyMsg] });
    } catch {
      // Soft-fail with an empty assistant message (client still renders)
      const now = new Date().toISOString();
      return sendSuccess(reply, { messages: [{ role: "assistant", content: "", ts: now }] });
    }
  });
}
