import { useEffect, useState } from "react";
import { fetchActivity, type ActivityItem } from "../api/activity";

function Badge({ kind }: { kind: ActivityItem["kind"] }) {
  const label = kind === "job" ? "Job"
    : kind === "export" ? "Export"
    : kind === "import" ? "Import"
    : kind === "audit" ? "Audit"
    : "Other";
  return <span className="text-[10px] px-1.5 py-0.5 border rounded">{label}</span>;
}

export function HomeActivityCard() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchActivity(10).then(list => { if (alive) setItems(list); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="border rounded-xl p-4" aria-label="Recent activity">
      <div className="font-medium mb-2">Activity</div>
      {!items && <div className="text-sm text-gray-500">Loading…</div>}
      {items && items.length === 0 && <div className="text-sm text-gray-500">No recent activity</div>}
      {items && items.length > 0 && (
        <ul className="grid gap-2">
          {items.map(a => (
            <li key={a.id} className="flex items-center justify-between gap-3 border rounded-lg p-3">
              <div className="min-w-0">
                <div className="text-sm truncate">{a.title}</div>
                <div className="text-xs text-gray-500">{new Date(a.at).toLocaleString()}</div>
              </div>
              <Badge kind={a.kind} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
