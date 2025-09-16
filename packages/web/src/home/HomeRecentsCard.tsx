import { useEffect, useState } from "react";
import { fetchRecentProjects, type LiteProject } from "../api/projects";

export function HomeRecentsCard() {
  const [items, setItems] = useState<LiteProject[] | null>(null);

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
            <li key={p.id} className="border rounded-lg p-3">
              <a href={`/project/${encodeURIComponent(p.id)}`} className="font-medium text-sm hover:underline block">
                {p.title}
              </a>
              {p.updatedAt && <div className="text-xs text-gray-500 mt-1">Updated {new Date(p.updatedAt).toLocaleDateString()}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
