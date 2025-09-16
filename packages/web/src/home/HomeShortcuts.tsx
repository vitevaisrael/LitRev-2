import { useEffect, useRef, useState } from "react";

export function HomeShortcuts() {
  const waiting = useRef(false);
  const timer = useRef<number | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const clear = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null; waiting.current = false; setActive(false);
    };
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === "/") {
        const el = document.querySelector<HTMLInputElement>('[data-home-search]');
        if (el) { e.preventDefault(); el.focus(); el.select?.(); }
        return;
      }
      if (e.key.toLowerCase() === "g") {
        waiting.current = true; setActive(true);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(clear, 1500) as unknown as number;
        return;
      }
      if (waiting.current) {
        const k = e.key.toLowerCase();
        if (k === "h") { e.preventDefault(); window.location.href = "/home"; clear(); return; }
        if (k === "p") { e.preventDefault(); window.location.href = "/projects"; clear(); return; }
        clear();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); if (timer.current) window.clearTimeout(timer.current); };
  }, []);

  return active ? (
    <div className="fixed bottom-3 right-3 text-xs text-gray-600 bg-white/90 border rounded px-2 py-1 shadow">
      g → (h: Home, p: Projects)
    </div>
  ) : null;
}
