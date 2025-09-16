export function HomeCreateProjectCard() {
  return (
    <div className="border rounded-xl p-4 flex flex-col gap-2" aria-label="Create project">
      <div className="font-medium">New Review</div>
      <p className="text-sm text-gray-500">Start a new project</p>
      <div className="mt-2">
        <a href="/projects" className="inline-block px-3 py-1.5 border rounded-lg hover:bg-gray-100 text-sm">
          Create project
        </a>
      </div>
    </div>
  );
}
