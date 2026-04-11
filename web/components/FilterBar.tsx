'use client';
import { Search, X } from 'lucide-react';
import { Dispatch, SetStateAction } from 'react';

export interface PlanData {
  id: string;
  toolName: string;
  planName: string;
  monthlyPrice: number;
  isFree: boolean;
  primaryModel: string | null;
  models: string | null;
  offers: string;
  restrictions: string | null;
  usageLimits: string | null;
  url: string | null;
  score: number;
  scoreBreakdown?: { label: string; value: number }[];
}

interface FilterBarProps {
  plans: PlanData[];
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  showFree: boolean | null;
  setShowFree: Dispatch<SetStateAction<boolean | null>>;
  sortBy: string;
  setSortBy: Dispatch<SetStateAction<string>>;
  category: string | null;
  setCategory: Dispatch<SetStateAction<string | null>>;
  filteredCount: number;
}

const SORT_OPTIONS = [
  { value: 'score', label: 'Best Score' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Name A-Z' },
];

const CATEGORY_OPTIONS = [
  { value: null, label: 'All' },
  { value: 'subscription', label: 'Monthly Plans' },
  { value: 'per-token', label: 'Per Token' },
];

export default function FilterBar({ 
  plans, 
  search, 
  setSearch, 
  showFree, 
  setShowFree, 
  sortBy, 
  setSortBy,
  category,
  setCategory,
  filteredCount
}: FilterBarProps) {
  const clearFilters = () => {
    setSearch('');
    setShowFree(null);
    setSortBy('score');
    setCategory(null);
  };

  const hasActiveFilters = search || showFree !== null || category !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search plans, models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-white/5 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 text-xs font-medium text-zinc-500">
          Showing <span className="font-bold text-white">{filteredCount}</span> of {plans.length} plans
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center p-4 bg-zinc-900/30 border border-white/5 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Type:</span>
          {[
            { value: null, label: 'All' },
            { value: false, label: 'Paid' },
            { value: true, label: 'Free' },
          ].map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => setShowFree(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                showFree === opt.value
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-white/5 text-zinc-400 border border-transparent hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Sort:</span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none px-3 py-1.5 pr-8 text-xs font-medium bg-zinc-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50 cursor-pointer hover:border-white/20 transition-colors"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-zinc-900">{opt.label}</option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Category:</span>
          <div className="flex gap-1">
            {CATEGORY_OPTIONS.map(opt => (
              <button
                key={String(opt.value)}
                onClick={() => setCategory(opt.value)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  category === opt.value
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-white/5 text-zinc-400 border border-transparent hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-white transition-colors ml-auto"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
