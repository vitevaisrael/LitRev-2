import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { ProjectList } from '../components/projects/ProjectList';

export function Projects() {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get('/health'),
    refetchInterval: 30000, // Check every 30 seconds
  });

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Projects</h1>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            health?.ok ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-sm text-gray-600">
            {health?.ok ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ProjectList />
      </div>
    </div>
  );
}
