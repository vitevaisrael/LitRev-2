import type { ChatMessage } from "../types";
import { flags } from "../../config/features";

export async function sendDemo(messages: ChatMessage[]): Promise<ChatMessage[]> {
  const last = [...messages].reverse().find(m => m.role === "user");
  const prompt = last?.content?.trim() || "";
  const now = new Date().toISOString();

  const tips = [
    "I can help plan a search strategy (databases, keywords, filters).",
    "Try: \"Draft inclusion/exclusion criteria for RCTs on X.\"",
    "Ask for a PRISMA flow outline or summarize recent findings."
  ].join(" ");

  const header = flags.PUBLIC_DEMO ? "Hi! I'm your Research Assistant (Demo)." : "Hi! I'm your Research Assistant.";

  const reply = prompt
    ? `${header}\n\n• Understanding: ${prompt}\n• Next steps: ${tips}${flags.PUBLIC_DEMO ? "\n\nNote: Client-side demo (no backend)." : ""}`
    : `${header} Ask me anything about your review.\n${tips}${flags.PUBLIC_DEMO ? "\n\nNote: Client-side demo (no backend)." : ""}`;

  return [{ role: "assistant", content: reply, ts: now }];
}
