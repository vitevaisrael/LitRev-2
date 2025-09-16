import { useEffect, useMemo, useState } from "react";
import { usePinnedProjects } from "../hooks/usePinned";
import { fetchLiteProjects, type LiteProject } from "../api/projects";

export function HomePinnedCard() {
  const { pinnedIds, unpin } = usePinnedProjects();
  const [all, setAll] = useState<LiteProject[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchLiteProjects(200).then(list => { if (alive) setAll(list); });
    return () => { alive = false; };
  }, []);

  const items = useMemo(() => {
    if (!all) return null;
    const byId = new Map(all.map(p => [String(p.id), p]));
    return pinnedIds.map(id => byId.get(String(id))).filter(Boolean) as LiteProject[];
  }, [all, pinnedIds]);

  return (
    <div className="border rounded-xl p-4">
      <div className="font-medium mb-2">Pinned Projects</div>
      {pinnedIds.length === 0 && (
        <div className="text-sm text-gray-500">No pinned projects yet. Use "Pin" in lists.</div>
      )}
      {!items && pinnedIds.length > 0 && <div className="text-sm text-gray-500">Loading…</div>}
      {items && items.length > 0 && (
        <ul className="grid sm:grid-cols-2 gap-2">
          {items.map(p => (
            <li key={p.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <a
                  href={`/project/${encodeURIComponent(String(p.id))}`}
                  className="font-medium text-sm hover:underline block"
                >
                  {p.title}
                </a>
                {p.updatedAt && (
                  <div className="text-xs text-gray-500 mt-1">
                    Updated {new Date(p.updatedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
              <button
                className="text-xs px-2 py-1 border rounded hover:bg-gray-100 shrink-0"
                onClick={(e) => { e.preventDefault(); unpin(String(p.id)); }}
                title="Unpin"
              >
                Unpin
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
