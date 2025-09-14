import { useState, useEffect } from 'react';

interface FilterBarProps {
  filters: {
    q?: string;
    year_min?: number;
    year_max?: number;
    journal?: string;
    status?: 'included' | 'excluded' | 'undecided';
  };
  onFiltersChange: (filters: any) => void;
}

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleReset = () => {
    const emptyFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  return (
    <div className="p-4 bg-gray-50 border-b">
      <div className="flex flex-wrap gap-4 items-end">
        {/* Search query */}
        <div className="flex-1 min-w-48">
          <label className="block text-sm font-medium mb-1">Search</label>
          <input
            type="text"
            value={localFilters.q || ''}
            onChange={(e) => handleFilterChange('q', e.target.value || undefined)}
            placeholder="Title, abstract, journal..."
            className="w-full px-3 py-2 border rounded text-sm"
          />
        </div>

        {/* Year range */}
        <div className="flex gap-2">
          <div>
            <label className="block text-sm font-medium mb-1">Year from</label>
            <input
              type="number"
              value={localFilters.year_min || ''}
              onChange={(e) => handleFilterChange('year_min', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="2020"
              className="w-20 px-2 py-2 border rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Year to</label>
            <input
              type="number"
              value={localFilters.year_max || ''}
              onChange={(e) => handleFilterChange('year_max', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="2024"
              className="w-20 px-2 py-2 border rounded text-sm"
            />
          </div>
        </div>

        {/* Journal */}
        <div className="min-w-32">
          <label className="block text-sm font-medium mb-1">Journal</label>
          <input
            type="text"
            value={localFilters.journal || ''}
            onChange={(e) => handleFilterChange('journal', e.target.value || undefined)}
            placeholder="NEJM, Lancet..."
            className="w-full px-3 py-2 border rounded text-sm"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={localFilters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
            className="px-3 py-2 border rounded text-sm"
          >
            <option value="">All</option>
            <option value="undecided">Undecided</option>
            <option value="included">Included</option>
            <option value="excluded">Excluded</option>
          </select>
        </div>

        {/* Reset button */}
        <button
          onClick={handleReset}
          className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
