import type { ChatMessage } from "./types";
import { sendDemo } from "./providers/demo";

/** Client-only provider switch (demo only for now). */
export async function sendChat(messages: ChatMessage[]): Promise<ChatMessage[]> {
  return sendDemo(messages);
}
