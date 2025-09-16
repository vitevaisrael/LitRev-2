import { useEffect, useState } from "react";
import { fetchRecentProjects, type LiteProject } from "../api/projects";
import { flags } from "../config/features";
import { usePinnedProjects } from "../hooks/usePinned";

export function HomeRecentsCard() {
  const [items, setItems] = useState<LiteProject[] | null>(null);
  const { isPinned, togglePin } = usePinnedProjects();

  useEffect(() => {
    let alive = true;
    fetchRecentProjects(8).then(list => { if (alive) setItems(list); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="border rounded-xl p-4" aria-label="Recent projects">
      <div className="font-medium mb-2">Recent Projects</div>
      {!items && <div className="text-sm text-gray-500">Loading…</div>}
      {items && items.length === 0 && <div className="text-sm text-gray-500">No recent activity</div>}
      {items && items.length > 0 && (
        <ul className="grid sm:grid-cols-2 gap-2">
          {items.map(p => (
            <li key={p.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <a href={`/project/${encodeURIComponent(p.id)}`} className="font-medium text-sm hover:underline block">
                  {p.title}
                </a>
                {p.updatedAt && <div className="text-xs text-gray-500 mt-1">Updated {new Date(p.updatedAt).toLocaleDateString()}</div>}
              </div>
              {(flags as any).HOME_PIN_ACTIONS && (
                <button
                  className="text-xs px-2 py-1 border rounded hover:bg-gray-100 shrink-0"
                  onClick={(e) => { e.preventDefault(); togglePin(String(p.id)); }}
                  title={isPinned(String(p.id)) ? "Unpin" : "Pin"}
                >
                  {isPinned(String(p.id)) ? "Unpin" : "Pin"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
