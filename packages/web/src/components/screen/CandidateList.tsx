import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Skeleton } from '../ui/skeleton';
import { Checkbox } from '../ui/checkbox';
import { ChevronLeft, ChevronRight, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import { FilterBar } from './FilterBar';

interface Candidate {
  id: string;
  title: string;
  journal: string;
  year: number;
  doi?: string;
  pmid?: string;
  score?: {
    total: number;
  };
  decisions?: Array<{
    action: string;
    ts: string;
  }>;
}

interface CandidateListProps {
  projectId: string;
  selectedId?: string;
  onSelect: (candidate: Candidate) => void;
  batchMode?: boolean;
  onBatchModeChange?: (enabled: boolean) => void;
}

export function CandidateList({
  projectId,
  selectedId,
  onSelect,
  batchMode = false,
  onBatchModeChange
}: CandidateListProps) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{
    q?: string;
    year_min?: number;
    year_max?: number;
    journal?: string;
    status?: 'included' | 'excluded' | 'undecided';
  }>({});
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.candidates(projectId, { ...filters, page, pageSize }),
    queryFn: () => {
      const rawParams: Record<string, string> = {
        ...(filters.q ? { q: filters.q } : {}),
        ...(filters.year_min ? { year_min: String(filters.year_min) } : {}),
        ...(filters.year_max ? { year_max: String(filters.year_max) } : {}),
        ...(filters.journal ? { journal: filters.journal } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        page: String(page),
        pageSize: String(pageSize),
      };
      const qs = new URLSearchParams(rawParams).toString();
      return api.get(`/projects/${projectId}/candidates?${qs}`);
    },
    enabled: !!projectId
  });

  const candidates = (data?.data as any)?.items || [];
  const total = (data?.data as any)?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  // Calculate screened count for progress bar
  const screenedCount = candidates.filter((c: any) => c.decisions && c.decisions.length > 0).length;
  const progressPercentage = total > 0 ? (screenedCount / total) * 100 : 0;

  return (
    <div className="h-full flex flex-col">
      <FilterBar filters={filters} onFiltersChange={handleFiltersChange} />
      
      {/* Header Card with Progress */}
      <Card className="m-4 mb-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Candidates ({total})
            </CardTitle>
            {onBatchModeChange && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="batch-mode"
                  checked={batchMode}
                  onCheckedChange={(checked) => onBatchModeChange(checked as boolean)}
                />
                <label htmlFor="batch-mode" className="text-sm font-medium cursor-pointer">
                  Batch mode
                </label>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Screened: {screenedCount}/{total}</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {candidates.map((candidate: any) => (
              <Card
                key={candidate.id}
                onClick={() => onSelect(candidate)}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedId === candidate.id
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm leading-tight line-clamp-2">
                      {candidate.title}
                    </h3>
                    
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline">{candidate.journal}</Badge>
                      <Badge variant="outline">{candidate.year}</Badge>
                      {candidate.score && (
                        <Badge variant="secondary">
                          Score: {candidate.score.total}/65
                        </Badge>
                      )}
                    </div>
                    
                    {candidate.decisions?.[0] && (
                      <div className="flex items-center gap-2">
                        {candidate.decisions[0].action === 'include' ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Included
                          </Badge>
                        ) : candidate.decisions[0].action === 'exclude' ? (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Excluded
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {candidate.decisions[0].action}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {totalPages > 1 && (
        <div className="p-4 border-t bg-muted/30">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
