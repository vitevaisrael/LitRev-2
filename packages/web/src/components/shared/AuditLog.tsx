interface AuditEntry {
  ts: string;
  kind: string;
  userId: string;
  details: any;
}

interface AuditLogProps {
  entries: AuditEntry[];
}

export function AuditLog({ entries }: AuditLogProps) {
  return (
    <div className="p-4">
      <h3 className="font-semibold mb-3">Audit Log</h3>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {entries.length === 0 ? (
          <p className="text-sm text-gray-500">No audit entries yet.</p>
        ) : (
          entries.map((entry, index) => (
            <div key={index} className="text-xs border-l-2 border-gray-200 pl-2">
              <div className="flex justify-between items-start">
                <span className="font-medium">{entry.kind}</span>
                <span className="text-gray-500">
                  {new Date(entry.ts).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-gray-600 mt-1">
                {entry.details?.message || JSON.stringify(entry.details)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
