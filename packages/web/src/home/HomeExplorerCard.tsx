import { useEffect, useMemo, useState } from "react";
import { fetchLiteProjects, type LiteProject } from "../api/projects";
import { flags } from "../config/features";
import { usePinnedProjects } from "../hooks/usePinned";

export function HomeExplorerCard() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<LiteProject[] | null>(null);
  const [loading, setLoading] = useState(false);
  const { isPinned, togglePin } = usePinnedProjects();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchLiteProjects(100)
      .then((list) => { if (alive) setItems(list); })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const visible = useMemo(() => {
    if (!items) return [];
    const n = q.trim().toLowerCase();
    const src = items;
    if (!n) return src.slice(0, 12);
    return src.filter(p => (p.title || "").toLowerCase().includes(n)).slice(0, 12);
  }, [q, items]);

  return (
    <div className="border rounded-xl p-4 flex flex-col gap-3" aria-label="Project explorer">
      <div className="font-medium">Project Explorer</div>
      <input
        data-home-search
        aria-label="Search projects"
        placeholder="Search projects…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="px-2 py-1.5 border rounded-lg text-sm outline-none"
      />
      {loading && <div className="text-sm text-gray-500">Loading…</div>}
      {!loading && (
        <ul className="grid gap-1">
          {visible.map(p => (
            <li key={p.id} className="flex justify-between items-center">
              <a href={`/project/${encodeURIComponent(p.id)}`} className="text-sm hover:underline">
                {p.title}
              </a>
              <div className="flex items-center gap-2">
                {p.updatedAt && <span className="text-xs text-gray-500">{new Date(p.updatedAt).toLocaleDateString()}</span>}
                {(flags as any).HOME_PIN_ACTIONS && (
                  <button
                    className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
                    onClick={(e) => { e.preventDefault(); togglePin(String(p.id)); }}
                    title={isPinned(String(p.id)) ? "Unpin" : "Pin"}
                  >
                    {isPinned(String(p.id)) ? "Unpin" : "Pin"}
                  </button>
                )}
              </div>
            </li>
          ))}
          {visible.length === 0 && <li className="text-sm text-gray-500">No results</li>}
        </ul>
      )}
      <div className="mt-1">
        <a href="/projects" className="text-xs text-gray-600 hover:underline">Open all projects →</a>
      </div>
    </div>
  );
}
