const Item = ({ href, label }: { href: string; label: string }) => (
  <a href={href} className="px-3 py-2 rounded hover:bg-gray-100 text-sm text-gray-800">{label}</a>
);

export function AppSidebar() {
  return (
    <aside className="hidden md:block h-[calc(100vh-56px)] w-60 border-r bg-white sticky top-14">
      <nav className="p-3 flex flex-col gap-1">
        <Item href="/home" label="Home" />
        <Item href="/projects" label="Projects" />
        <Item href="/projects/new" label="Create Project" />
        <Item href="/activity" label="Jobs / Activity" />
        <Item href="/ledger" label="Evidence Ledger" />
        <Item href="/drafts" label="Drafts" />
        <Item href="/exports" label="Exports" />
        <Item href="/settings" label="Settings" />
      </nav>
    </aside>
  );
}
