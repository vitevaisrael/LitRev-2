import { useState } from 'react';
import { useProjects, useCreateProject } from '../../hooks/useApi';

export function ProjectList() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const [newProjectTitle, setNewProjectTitle] = useState('');

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;
    
    try {
      await createProject.mutateAsync({ title: newProjectTitle });
      setNewProjectTitle('');
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading projects...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Projects</h2>
      
      <form onSubmit={handleCreateProject} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newProjectTitle}
            onChange={(e) => setNewProjectTitle(e.target.value)}
            placeholder="New project title..."
            className="flex-1 px-3 py-2 border rounded-md"
          />
          <button
            type="submit"
            disabled={createProject.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {createProject.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
      
      <div className="space-y-2">
        {projects?.data?.projects?.map((project: any) => (
          <div key={project.id} className="p-3 border rounded-md hover:bg-gray-50">
            <h3 className="font-medium">{project.title}</h3>
            <p className="text-sm text-gray-500">
              Created {new Date(project.createdAt).toLocaleDateString()}
            </p>
            {project.prisma && (
              <div className="text-xs text-gray-400 mt-1">
                {project.prisma.identified} identified, {project.prisma.included} included
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
