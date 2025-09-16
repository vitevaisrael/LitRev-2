import { useEffect, useRef, useState } from "react";

export function QuickCreateProjectModal({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev || "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const qp = t ? "?title=" + encodeURIComponent(t) : "";
    window.location.href = "/projects/new" + qp;
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Quick create project"
    >
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div
        ref={dialogRef}
        className="relative w-full max-w-lg rounded-xl border bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium">New Review</div>
            <button
              type="button"
              className="text-xs px-2 py-0.5 border rounded hover:bg-gray-100"
              onClick={onClose}
              aria-label="Close"
            >
              Esc
            </button>
          </div>
          <label className="block text-sm text-gray-700 mb-1">Title (optional)</label>
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Effects of X on Y — scoping review"
            className="w-full px-3 py-2 border rounded-lg text-sm outline-none"
          />
          <div className="mt-3 flex items-center gap-2">
            <button type="submit" className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-100">
              Create
            </button>
            <button type="button" className="px-3 py-2 border rounded-lg text-sm" onClick={onClose}>
              Cancel
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            You’ll be redirected to the full create form.
          </div>
        </form>
      </div>
    </div>
  );
}

