export type ActivityItem = {
  id: string;
  kind: "job" | "audit" | "export" | "import" | "other";
  title: string;
  at: string; // ISO timestamp
  meta?: Record<string, any>;
};

async function tryJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch { return null; }
}

export async function fetchActivity(limit = 10): Promise<ActivityItem[]> {
  // Prefer direct endpoint first (graceful fallback if unavailable)
  try {
    const direct = await tryJson(`/api/v1/activity?limit=${limit}`);
    const arr = direct?.data?.items ?? (Array.isArray(direct?.data) ? direct.data : undefined);
    if (Array.isArray(arr)) {
      return arr.slice(0, limit).map((x: any, i: number) => ({
        id: String(x.id ?? `a${i}`),
        kind: (x.kind === "export" || x.kind === "import" || x.kind === "job" || x.kind === "audit") ? x.kind : "other" as const,
        title: String(x.title ?? "Activity"),
        at: String(x.at ?? new Date().toISOString()),
        meta: x.meta ?? undefined,
      }));
    }
  } catch {}

  const candidates = [
    `/api/v1/jobs?limit=${limit}`,       // hypothetical
    `/api/v1/audit-logs?limit=${limit}`, // hypothetical
  ];
  for (const u of candidates) {
    const data = await tryJson(u);
    const arr =
      data?.data?.items ??
      data?.data?.activity ??
      (Array.isArray(data?.data) ? data.data : undefined) ??
      (Array.isArray(data) ? data : undefined);
    if (Array.isArray(arr)) {
      return arr.slice(0, limit).map((x: any, i: number) => ({
        id: String(x.id ?? x.jobId ?? x._id ?? `a${i}`),
        kind:
          (x.type ?? x.kind ?? x.action ?? "other").toString().toLowerCase().includes("export")
            ? "export"
            : (x.type ?? x.kind ?? x.action ?? "other").toString().toLowerCase().includes("import")
            ? "import"
            : (x.type ?? x.kind ?? x.action ?? "").toString().toLowerCase().includes("audit")
            ? "audit"
            : (x.type ?? x.kind ?? x.action ?? "").toString().toLowerCase().includes("job")
            ? "job"
            : "other",
        title: String(x.title ?? x.name ?? x.action ?? x.type ?? "Activity"),
        at: String(x.timestamp ?? x.createdAt ?? x.created_at ?? new Date().toISOString()),
        meta: x.details ?? x.meta ?? undefined,
      }));
    }
  }
  return [];
}
