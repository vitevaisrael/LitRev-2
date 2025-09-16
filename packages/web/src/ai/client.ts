import type { ChatMessage } from "./types";
import { api } from "../lib/api";
import { sendDemo } from "./providers/demo";

/** Prefer server endpoint (CSRF + cookies via shared `api`), fallback to demo provider. */
export async function sendChat(messages: ChatMessage[]): Promise<ChatMessage[]> {
  try {
    const resp = await api.post<{ messages: ChatMessage[] }>("/ai/chat", { messages });
    const arr = (resp as any)?.data?.messages ?? (resp as any)?.messages;
    if (Array.isArray(arr)) return arr as ChatMessage[];
  } catch {
    // ignore and fallback
  }
  return sendDemo(messages);
}
