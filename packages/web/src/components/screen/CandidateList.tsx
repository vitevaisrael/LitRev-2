import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
}

export function CandidateList({ 
  projectId, 
  selectedId, 
  onSelect
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

  return (
    <div>
      <FilterBar filters={filters} onFiltersChange={handleFiltersChange} />
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">
          Candidates ({total})
        </h2>
      
      {isLoading && <div className="text-sm text-gray-500">Loading...</div>}
      
      <div className="space-y-2">
        {candidates.map((candidate: any) => (
          <div
            key={candidate.id}
            onClick={() => onSelect(candidate)}
            className={`p-3 border rounded cursor-pointer transition-colors ${
              selectedId === candidate.id
                ? 'bg-blue-50 border-blue-200'
                : 'hover:bg-gray-50'
            }`}
          >
            <h3 className="font-medium text-sm mb-1 line-clamp-2">
              {candidate.title}
            </h3>
            <div className="text-xs text-gray-600 space-y-1">
              <div>{candidate.journal} ({candidate.year})</div>
              {candidate.score && (
                <div className="font-medium">Score: {candidate.score.total}/65</div>
              )}
              {candidate.decisions?.[0] && (
                <div className={`text-xs px-1 py-0.5 rounded ${
                  candidate.decisions[0].action === 'include' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {candidate.decisions[0].action}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
      </div>
    </div>
  );
}