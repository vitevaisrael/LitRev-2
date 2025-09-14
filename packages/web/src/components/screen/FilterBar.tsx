import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Search, RotateCcw } from 'lucide-react';

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
    <Card className="m-4 mb-0">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Search query */}
          <div className="flex-1 min-w-48">
            <Label htmlFor="search" className="text-sm font-medium">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                type="text"
                value={localFilters.q || ''}
                onChange={(e) => handleFilterChange('q', e.target.value || undefined)}
                placeholder="Title, abstract, journal..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Year range */}
          <div className="flex gap-2">
            <div>
              <Label htmlFor="year-min" className="text-sm font-medium">Year from</Label>
              <Input
                id="year-min"
                type="number"
                value={localFilters.year_min || ''}
                onChange={(e) => handleFilterChange('year_min', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="2020"
                className="w-20"
              />
            </div>
            <div>
              <Label htmlFor="year-max" className="text-sm font-medium">Year to</Label>
              <Input
                id="year-max"
                type="number"
                value={localFilters.year_max || ''}
                onChange={(e) => handleFilterChange('year_max', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="2024"
                className="w-20"
              />
            </div>
          </div>

          {/* Journal */}
          <div className="min-w-32">
            <Label htmlFor="journal" className="text-sm font-medium">Journal</Label>
            <Input
              id="journal"
              type="text"
              value={localFilters.journal || ''}
              onChange={(e) => handleFilterChange('journal', e.target.value || undefined)}
              placeholder="NEJM, Lancet..."
            />
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status" className="text-sm font-medium">Status</Label>
            <select
              id="status"
              value={localFilters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">All</option>
              <option value="undecided">Undecided</option>
              <option value="included">Included</option>
              <option value="excluded">Excluded</option>
            </select>
          </div>

          {/* Reset button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-10"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
