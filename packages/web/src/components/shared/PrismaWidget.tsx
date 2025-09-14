interface PrismaCounters {
  identified: number;
  duplicates: number;
  screened: number;
  included: number;
  excluded: number;
}

interface PrismaHistoryPoint {
  timestamp: string;
  identified: number;
  duplicates: number;
  screened: number;
  included: number;
  excluded: number;
}

interface PrismaWidgetProps {
  counters: PrismaCounters;
  history?: PrismaHistoryPoint[];
}

export function PrismaWidget({ counters, history = [] }: PrismaWidgetProps) {
  const { identified, duplicates, screened, included, excluded } = counters;
  const remaining = identified - duplicates - screened;

  // Generate sparkline data for screened count over time
  const generateSparkline = () => {
    if (history.length < 2) return null;
    
    const maxScreened = Math.max(...history.map(h => h.screened));
    const minScreened = Math.min(...history.map(h => h.screened));
    const range = maxScreened - minScreened || 1;
    
    const width = 100;
    const height = 20;
    const points = history.map((point, index) => {
      const x = (index / (history.length - 1)) * width;
      const y = height - ((point.screened - minScreened) / range) * height;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <svg width={width} height={height} className="text-blue-500">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    );
  };

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
        
        {/* Mini Flow Display */}
        <div className="mt-3 p-2 bg-gray-50 rounded">
          <div className="text-xs font-medium text-gray-600 mb-1">Mini Flow</div>
          <div className="flex items-center justify-between text-xs">
            <span>Identified: {identified}</span>
            <span>→</span>
            <span>Duplicates: {duplicates}</span>
            <span>→</span>
            <span>Screened: {screened}</span>
            <span>→</span>
            <span className="text-green-600">Included: {included}</span>
            <span>|</span>
            <span className="text-red-600">Excluded: {excluded}</span>
          </div>
        </div>

        {/* Sparkline */}
        {history.length > 1 && (
          <div className="mt-2 p-2 bg-blue-50 rounded">
            <div className="text-xs font-medium text-gray-600 mb-1">Screened per day</div>
            <div className="flex items-center">
              {generateSparkline()}
              <span className="ml-2 text-xs text-gray-500">
                {history[history.length - 1]?.screened || 0} total
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
