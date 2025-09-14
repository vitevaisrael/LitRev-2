import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

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
  isLoading?: boolean;
}

export function PrismaWidget({ counters, isLoading = false }: PrismaWidgetProps) {
  const { identified, duplicates, screened, included, excluded } = counters;
  const remaining = identified - duplicates - screened;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">PRISMA Flow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">PRISMA Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Identified</span>
            <span className="text-2xl font-bold">{identified}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Duplicates</span>
            <span className="text-2xl font-bold">{duplicates}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Screened</span>
            <span className="text-2xl font-bold">{screened}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Included</span>
            <span className="text-2xl font-bold text-green-600">{included}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Excluded</span>
            <span className="text-2xl font-bold text-red-600">{excluded}</span>
          </div>
          {remaining > 0 && (
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Remaining</span>
              <span className="text-2xl font-bold text-orange-600">{remaining}</span>
            </div>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Progress: {screened}/{identified - duplicates} ({Math.round((screened / Math.max(identified - duplicates, 1)) * 100)}%)
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
