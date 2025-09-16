import { useRef, useState } from "react";
import { flags } from "../config/features";
import type { ChatMessage } from "../ai/types";
import { sendChat } from "../ai/client";

export function HomeAIChatCard() {
  if (!flags.HOME_AI) return null;

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: "assistant",
      content:
        (flags.PUBLIC_DEMO ? "Hi! I'm your Research Assistant (Demo). " : "Hi! I'm your Research Assistant. ") +
        "Ask me to draft queries, outline methods, or summarize findings.",
      ts: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setInput("");

    const next: ChatMessage[] = [
      ...messages,
      { role: "user", content: text, ts: new Date().toISOString() },
    ];
    setMessages(next);

    try {
      const reply = await sendChat(next);
      setMessages([
        ...next,
        ...(Array.isArray(reply) && reply.length
          ? reply
          : [{ role: "assistant" as const, content: "No response (demo).", ts: new Date().toISOString() }]),
      ]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant" as const, content: "There was an error responding (demo).", ts: new Date().toISOString() },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border rounded-xl p-4 flex flex-col gap-3" data-home-ai>
      <div className="flex items-center justify-between">
        <div className="font-medium">Research Assistant</div>
        {flags.PUBLIC_DEMO && (
          <span className="text-xs px-2 py-0.5 border rounded">Demo</span>
        )}
      </div>

      <div className="max-h-80 overflow-auto space-y-3 pr-1" role="log" aria-live="polite">
        {messages.map((m, idx) => (
          <div key={idx} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={
                "inline-block rounded-lg px-3 py-2 text-sm " +
                (m.role === "user" ? "bg-blue-50 border border-blue-200" : "bg-gray-50 border")
              }
            >
              <div className="whitespace-pre-wrap break-words">{m.content}</div>
            </div>
          </div>
        ))}
      </div>

      <form ref={formRef} onSubmit={onSubmit} className="flex items-center gap-2" aria-busy={busy}>
        <input
          placeholder="Ask: Draft inclusion criteria for…"
          className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          aria-label="Chat prompt"
        />
        <button
          type="submit"
          className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50"
          disabled={busy}
          aria-label="Send"
        >
          {busy ? "…" : "Send"}
        </button>
      </form>

      <div className="text-xs text-gray-500">
        {flags.PUBLIC_DEMO
          ? "Client-side demo. No data is sent to a server."
          : "Responses are generated locally for this preview."}
      </div>
    </div>
  );
}
