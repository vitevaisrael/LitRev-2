import { useEffect, useMemo, useState } from "react";
import { flags } from "../config/features";
import { fetchLiteProjects, type LiteProject } from "../api/projects";

type Cmd = { id: string; label: string; href: string; group?: string };

function useHotkey(openSetter: (v: boolean) => void) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const meta = isMac ? e.metaKey : e.ctrlKey;
      if (meta && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        openSetter(true);
      } else if (e.key === "Escape") {
        openSetter(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openSetter]);
}

export function CommandPalette() {
  const enabled = (flags as any).COMMAND_MENU;
  const quick = (flags as any).QUICK_SWITCHER;

  if (!enabled) return null;

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [projects, setProjects] = useState<LiteProject[] | null>(null);
  const [loading, setLoading] = useState(false);

  useHotkey(setOpen);

  useEffect(() => {
    if (!open || !quick || projects) return;
    let alive = true;
    setLoading(true);
    fetchLiteProjects().then((list) => { if (alive) setProjects(list); }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [open, projects, quick]);

  const baseCommands: Cmd[] = useMemo(() => ([
    { id: "nav:home", label: "Home", href: "/home", group: "Navigate" },
    { id: "nav:projects", label: "All Projects", href: "/projects", group: "Navigate" },
    { id: "nav:create", label: "Create Project", href: "/projects", group: "Navigate" },
  ]), []);

  const projectCommands: Cmd[] = useMemo(() => {
    if (!quick || !projects) return [];
    return projects.map((p) => ({
      id: `proj:${p.id}`,
      label: p.title || "Untitled",
      href: `/project/${encodeURIComponent(p.id)}`,
      group: "Projects",
    }));
  }, [projects, quick]);

  const commands = useMemo(() => {
    const all = [...baseCommands, ...projectCommands];
    const n = q.trim().toLowerCase();
    if (!n) return all;
    return all.filter(c => c.label.toLowerCase().includes(n));
  }, [q, baseCommands, projectCommands]);

  const onSelect = (href: string) => {
    setOpen(false);
    window.location.href = href;
  };

  return (
    <>
      <button
        type="button"
        aria-hidden="true"
        style={{ position: "fixed", inset: "-1000px" }}
        onClick={() => setOpen(true)}
      />
      {open && <div className="fixed inset-0 z-[100] bg-black/30" onClick={() => setOpen(false)} aria-hidden="true" />}
      {open && (
        <div
          className="fixed inset-0 z-[101] flex items-start justify-center pt-[10vh] px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Command menu"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const first = commands[0];
              if (first) onSelect(first.href);
            }
          }}
        >
          <div className="w-full max-w-xl rounded-xl border bg-white shadow-xl">
            <div className="flex items-center gap-2 px-3 py-2 border-b">
              <span className="text-gray-500 text-sm">⌘/Ctrl + K</span>
              <input
                autoFocus
                placeholder="Type a command or project name…"
                className="flex-1 px-2 py-2 outline-none text-sm"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <button className="text-gray-500 text-sm" onClick={() => setOpen(false)}>Esc</button>
            </div>
            <div className="max-h-[50vh] overflow-auto p-2">
              {loading && <div className="px-2 py-2 text-sm text-gray-500">Loading projects…</div>}
              {!loading && commands.length === 0 && (
                <div className="px-2 py-2 text-sm text-gray-500">No matches</div>
              )}
              {["Navigate", "Projects"].map((grp) => {
                const items = commands.filter(c => c.group === grp);
                if (items.length === 0) return null;
                return (
                  <div key={grp} className="mb-2">
                    <div className="px-2 py-1 text-[11px] uppercase tracking-wider text-gray-500">{grp}</div>
                    <ul className="flex flex-col">
                      {items.map((c) => (
                        <li key={c.id}>
                          <a
                            href={c.href}
                            className="block px-2 py-2 rounded hover:bg-gray-100 text-sm"
                            onClick={(e) => { e.preventDefault(); onSelect(c.href); }}
                          >
                            {c.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}