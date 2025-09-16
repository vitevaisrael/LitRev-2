export function AppHeader() {
  return (
    <header className="w-full border-b bg-white/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/home" className="font-semibold tracking-tight">LitRev</a>
          <span className="text-sm text-gray-500 hidden sm:block">Home</span>
        </div>
        <div className="text-sm text-gray-500">
          <kbd className="px-1.5 py-0.5 border rounded">⌘</kbd> + <kbd className="px-1.5 py-0.5 border rounded">K</kbd>
        </div>
      </div>
    </header>
  );
}
