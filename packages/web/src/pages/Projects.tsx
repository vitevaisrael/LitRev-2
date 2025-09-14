import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
// import { queryKeys } from '../lib/queryKeys';
import { ProjectList } from '../components/projects/ProjectList';
import { useState, useMemo } from 'react';

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

  // Unified details payload for tooltip/collapsible
  const healthDetails = useMemo(() => {
    if (!health) return null as any;
    if ((health as any).ok) return (health as any).data;
    const err: any = (health as any).error;
    if (err?.code === 'HEALTH_DEGRADED') {
      try { return JSON.parse(err.message); } catch { return null as any; }
    }
    return null as any;
  }, [health]);

  const [showHealthDetails, setShowHealthDetails] = useState(false);

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Projects</h1>
        <div className="relative flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${healthInfo.color}`} />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">{healthInfo.label}</span>
            {healthInfo.services && (
              <span className="text-xs text-gray-500">
                DB {healthInfo.services.db ? '✓' : '✗'} · Redis {healthInfo.services.redis ? '✓' : '✗'} · S3 {healthInfo.services.s3 ? '✓' : '✗'}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowHealthDetails(v => !v)}
            className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
            title="Show health details"
          >
            Details
          </button>

          {showHealthDetails && healthDetails && (
            <div className="absolute right-0 top-10 w-72 bg-white border rounded shadow-lg p-3 text-xs z-10">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-800">Service Status</span>
                <button onClick={() => setShowHealthDetails(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Database</span>
                  <span className={healthDetails.services?.db ? 'text-green-700' : 'text-red-700'}>
                    {healthDetails.services?.db ? 'OK' : 'DOWN'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Redis</span>
                  <span className={healthDetails.services?.redis ? 'text-green-700' : 'text-red-700'}>
                    {healthDetails.services?.redis ? 'OK' : 'DOWN'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">S3/MinIO</span>
                  <span className={healthDetails.services?.s3 ? 'text-green-700' : 'text-red-700'}>
                    {healthDetails.services?.s3 ? 'OK' : 'DOWN'}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-gray-500">
                <div>Uptime: {typeof healthDetails.uptimeSec === 'number' ? `${healthDetails.uptimeSec}s` : '-'}</div>
                <div>Response: {typeof healthDetails.responseMs === 'number' ? `${healthDetails.responseMs}ms` : '-'}</div>
                <div>Timestamp: {healthDetails.timestamp ? new Date(healthDetails.timestamp).toLocaleString() : '-'}</div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ProjectList />
      </div>
    </div>
  );
}
