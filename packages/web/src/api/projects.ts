export type LiteProject = { id: string; title: string; updatedAt?: string };

async function tryJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch { return null; }
}

export async function fetchLiteProjects(limit = 50): Promise<LiteProject[]> {
  const candidates = [`/api/v1/projects?limit=${limit}`, `/api/v1/projects`];
  for (const u of candidates) {
    const data = await tryJson(u);
    const arr =
      data?.data?.projects ??
      (Array.isArray(data?.data) ? data.data : undefined) ??
      (Array.isArray(data) ? data : undefined);
    if (Array.isArray(arr)) {
      return arr
        .map((p: any) => ({
          id: String(p.id ?? p._id ?? p.uuid ?? ""),
          title: String(p.title ?? p.name ?? "Untitled"),
          updatedAt: p.updatedAt ?? p.updated_at ?? p.modifiedAt ?? p.mtime ?? p.createdAt ?? undefined,
        }))
        .filter((p: LiteProject) => p.id);
    }
  }
  const now = new Date().toISOString();
  return [
    { id: "demo-1", title: "Demo Review A", updatedAt: now },
    { id: "demo-2", title: "Demo Review B", updatedAt: now },
  ];
}
