import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

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
  const hasData = project.prisma && project.prisma.identified > 0;
  const isHealthy = hasData && (project.prisma?.screened ?? 0) > 0;

  return (
    <Card 
      onClick={onClick}
      className="cursor-pointer hover:shadow-md transition-shadow"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{project.title}</CardTitle>
          <Badge variant={isHealthy ? "default" : "secondary"}>
            {isHealthy ? "Active" : "New"}
          </Badge>
        </div>
        <CardDescription>
          Created {new Date(project.createdAt).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      
      {project.prisma && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Identified:</span>
              <span className="font-medium">{project.prisma.identified}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Included:</span>
              <span className="font-medium">{project.prisma.included}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Excluded:</span>
              <span className="font-medium">{project.prisma.excluded}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Screened:</span>
              <span className="font-medium">{project.prisma.screened}</span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
