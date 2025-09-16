export default function HomePage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-gray-500">Quick actions and your work at a glance.</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border rounded-xl p-4"><div className="font-medium">Create Review</div><p className="text-sm text-gray-500">Start a new project</p></div>
        <div className="border rounded-xl p-4"><div className="font-medium">Search Literature</div><p className="text-sm text-gray-500">PubMed and more</p></div>
        <div className="border rounded-xl p-4"><div className="font-medium">Continue Screening</div><p className="text-sm text-gray-500">Jump back in</p></div>
        <div className="border rounded-xl p-4"><div className="font-medium">Export Manuscript</div><p className="text-sm text-gray-500">DOCX / BibTeX / PRISMA</p></div>
      </section>
      <section className="border rounded-xl p-4"><div className="font-medium mb-2">Projects snapshot</div><div className="text-sm text-gray-500">Coming soon…</div></section>
      <section className="border rounded-xl p-4"><div className="font-medium mb-2">Activity</div><div className="text-sm text-gray-500">Background jobs at a glance (soon)</div></section>
    </div>
  );
}
