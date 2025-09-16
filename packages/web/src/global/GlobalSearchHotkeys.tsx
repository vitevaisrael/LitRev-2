import { useEffect, useState } from "react";
import { flags } from "../config/features";
import { QuickCreateProjectModal } from "../components/QuickCreateProjectModal";

/**
 * Mounts globally. When enabled:
 * - "/" opens the Command Palette anywhere (by synthesizing Cmd/Ctrl+K).
 * - "n" opens a Quick Create modal (client-side redirect to /projects/new).
 */
export function GlobalSearchHotkeys() {
  const enableSearch = (flags as any).GLOBAL_SEARCH && (flags as any).COMMAND_MENU;
  const enableQuick = (flags as any).QUICK_CREATE;

  const [openQuick, setOpenQuick] = useState(false);

  useEffect(() => {
    if (!enableSearch && !enableQuick) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const editable = (target as any)?.isContentEditable;
      const inField = tag === "input" || tag === "textarea" || tag === "select" || editable;

      // "/" opens palette (global)
      if (enableSearch && e.key === "/" && !inField) {
        e.preventDefault();
        // Synthesize palette hotkey: both Ctrl+K and Meta+K (Mac)
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
        return;
      }
      // "n" opens quick create
      if (enableQuick && e.key.toLowerCase() === "n" && !inField) {
        e.preventDefault();
        setOpenQuick(true);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enableSearch, enableQuick]);

  return enableQuick ? (
    <QuickCreateProjectModal open={openQuick} onClose={() => setOpenQuick(false)} />
  ) : null;
}

