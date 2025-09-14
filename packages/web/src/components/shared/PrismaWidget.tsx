interface PrismaCounters {
  identified: number;
  duplicates: number;
  screened: number;
  included: number;
  excluded: number;
}

interface PrismaWidgetProps {
  counters: PrismaCounters;
}

export function PrismaWidget({ counters }: PrismaWidgetProps) {
  const { identified, duplicates, screened, included, excluded } = counters;
  const remaining = identified - duplicates - screened;

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-3">PRISMA Flow</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
          <span className="text-sm">Records identified</span>
          <span className="font-medium">{identified}</span>
        </div>
        
        <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
          <span className="text-sm">Duplicates removed</span>
          <span className="font-medium">{duplicates}</span>
        </div>
        
        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
          <span className="text-sm">Records screened</span>
          <span className="font-medium">{screened}</span>
        </div>
        
        <div className="flex justify-between items-center p-2 bg-green-50 rounded">
          <span className="text-sm">Records included</span>
          <span className="font-medium text-green-700">{included}</span>
        </div>
        
        <div className="flex justify-between items-center p-2 bg-red-50 rounded">
          <span className="text-sm">Records excluded</span>
          <span className="font-medium text-red-700">{excluded}</span>
        </div>
        
        {remaining > 0 && (
          <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
            <span className="text-sm">Remaining to screen</span>
            <span className="font-medium text-orange-700">{remaining}</span>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        <div>Progress: {screened}/{identified - duplicates} ({Math.round((screened / Math.max(identified - duplicates, 1)) * 100)}%)</div>
      </div>
    </div>
  );
}
