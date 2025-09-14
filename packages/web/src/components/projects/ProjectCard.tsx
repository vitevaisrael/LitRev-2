interface ProjectCardProps {
  project: {
    id: string;
    title: string;
    createdAt: string;
    prisma?: {
      identified: number;
      duplicates: number;
      screened: number;
      included: number;
      excluded: number;
    };
  };
  onClick: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <div 
      onClick={onClick}
      className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
    >
      <h3 className="font-semibold text-lg mb-2">{project.title}</h3>
      <p className="text-sm text-gray-600 mb-2">
        Created {new Date(project.createdAt).toLocaleDateString()}
      </p>
      
      {project.prisma && (
        <div className="text-xs text-gray-500 space-y-1">
          <div>Identified: {project.prisma.identified}</div>
          <div>Included: {project.prisma.included}</div>
          <div>Excluded: {project.prisma.excluded}</div>
        </div>
      )}
    </div>
  );
}
