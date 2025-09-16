import { useCallback, useEffect, useState } from "react";

const KEY = "pinnedProjects";

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(x => typeof x === "string") : [];
  } catch { return []; }
}
function write(ids: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(Array.from(new Set(ids)))); } catch {}
}

export function usePinnedProjects() {
  const [ids, setIds] = useState<string[]>(() => read());

  // cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setIds(read()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const pin = useCallback((id: string) => {
    setIds(prev => { const next = prev.includes(id) ? prev : [...prev, id]; write(next); return next; });
  }, []);
  const unpin = useCallback((id: string) => {
    setIds(prev => { const next = prev.filter(x => x !== id); write(next); return next; });
  }, []);
  const togglePin = useCallback((id: string) => {
    setIds(prev => { const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]; write(next); return next; });
  }, []);
  const isPinned = useCallback((id: string) => ids.includes(id), [ids]);

  return { pinnedIds: ids, pin, unpin, togglePin, isPinned };
}
