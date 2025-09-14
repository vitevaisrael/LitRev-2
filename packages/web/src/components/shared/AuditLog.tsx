import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';

interface AuditLogProps {
  projectId: string;
}

export function AuditLog({ projectId }: AuditLogProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.auditLogs(projectId),
    queryFn: () => api.get(`/projects/${projectId}/audit-logs?limit=20`),
    enabled: !!projectId
  });

  const entries = (data?.data as any)?.auditLogs || [];

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'import_completed':
        return 'default';
      case 'decide':
        return 'secondary';
      case 'export':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Audit Log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between items-start">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Failed to load audit log entries.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet</p>
          ) : (
            entries.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <Badge variant={getActionBadgeVariant(entry.action)} className="text-xs">
                    {entry.action}
                  </Badge>
                  <div className="text-sm text-muted-foreground mt-1 truncate">
                    {entry.details?.message || JSON.stringify(entry.details)}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
