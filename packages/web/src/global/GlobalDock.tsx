import { useEffect, useRef, useState } from "react";
import { flags } from "../config/features";

function LinkItem({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="block px-3 py-2 rounded hover:bg-gray-100 text-sm text-gray-800"
    >
      {label}
    </a>
  );
}

export function GlobalDock() {
  if (!(flags as any).GLOBAL_DOCK) return null;

  const [open, setOpen] = useState(false);
  const firstFocusRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    if (open) {
      document.body.style.overflow = "hidden";
      setTimeout(() => firstFocusRef.current?.focus(), 0);
    } else {
      document.body.style.overflow = prev || "";
    }
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [open]);

  return (
    <>
      {/* Launcher button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Quick actions"
        className="fixed z-[1002] bottom-5 right-5 h-12 w-12 rounded-full border shadow-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Open quick actions"
      >
        ≡
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[1000] bg-black/30"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Quick actions"
          className="fixed z-[1001] bottom-20 right-5 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <div className="font-medium">Quick actions</div>
            <button
              className="text-sm text-gray-600 hover:text-gray-900"
              onClick={() => setOpen(false)}
              aria-label="Close quick actions"
            >
              Esc
            </button>
          </div>
          <div className="p-3">
            <nav className="flex flex-col gap-1">
              <a
                href="/home"
                ref={firstFocusRef}
                className="block px-3 py-2 rounded hover:bg-gray-100 text-sm text-gray-800"
              >
                Home
              </a>
              <LinkItem href="/projects" label="Projects" />
              <LinkItem href="/projects/new" label="Create Project" />
              <LinkItem href="/activity" label="Jobs / Activity" />
              <LinkItem href="/ledger" label="Evidence Ledger" />
              <LinkItem href="/exports" label="Exports" />
              <LinkItem href="/settings" label="Settings" />
            </nav>
            <div className="mt-3 text-xs text-gray-500">
              Tip: Press ⌘/Ctrl + K for the command menu.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
