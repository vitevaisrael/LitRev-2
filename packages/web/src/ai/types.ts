export type ChatRole = "system" | "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string; ts?: string };
