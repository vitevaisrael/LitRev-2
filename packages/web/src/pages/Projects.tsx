import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
// import { queryKeys } from '../lib/queryKeys';
import { ProjectList } from '../components/projects/ProjectList';

export function Projects() {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get('/health'),
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Derive health status for UI
  const healthInfo = (() => {
    if (!health) return { color: 'bg-gray-400', label: 'Unknown', services: null as any };

    // Healthy path (ok: true)
    if (health.ok) {
      const data: any = health.data;
      return {
        color: 'bg-green-500',
        label: 'Connected',
        services: data?.services || null
      };
    }

    // Degraded path (ok: false, code: HEALTH_DEGRADED, message: JSON string)
    const err: any = (health as any).error;
    if (err?.code === 'HEALTH_DEGRADED') {
      try {
        const payload = JSON.parse(err.message);
        return {
          color: 'bg-yellow-500',
          label: 'Degraded',
          services: payload?.services || null
        };
      } catch {
        // Fallthrough to disconnected
      }
    }

    return { color: 'bg-red-500', label: 'Disconnected', services: null as any };
  })();

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Projects</h1>
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${healthInfo.color}`} />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">{healthInfo.label}</span>
            {healthInfo.services && (
              <span className="text-xs text-gray-500">
                DB {healthInfo.services.db ? '✓' : '✗'} · Redis {healthInfo.services.redis ? '✓' : '✗'} · S3 {healthInfo.services.s3 ? '✓' : '✗'}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ProjectList />
      </div>
    </div>
  );
}
