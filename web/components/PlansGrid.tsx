'use client';
import { useState, useMemo } from 'react';
import PlanCard from './PlanCard';
import FilterBar, { PlanData } from './FilterBar';

interface PlansGridProps {
  initialPlans: PlanData[];
}

const PER_TOKEN_PROVIDERS = ['DeepSeek', 'Gemini API', 'GLM', 'Qwen', 'MiniMax', 'Kimi', 'Ollama'];

export default function PlansGrid({ initialPlans }: PlansGridProps) {
  const [search, setSearch] = useState('');
  const [showFree, setShowFree] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState('score');
  const [category, setCategory] = useState<string | null>(null);

  const filteredPlans = useMemo(() => {
    let result = [...initialPlans];

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(p => {
        const modelsStr = p.models ? JSON.stringify(p.models).toLowerCase() : '';
        return (
          p.toolName.toLowerCase().includes(searchLower) ||
          p.planName.toLowerCase().includes(searchLower) ||
          (p.primaryModel && p.primaryModel.toLowerCase().includes(searchLower)) ||
          modelsStr.includes(searchLower) ||
          p.offers.toLowerCase().includes(searchLower) ||
          (p.usageLimits && p.usageLimits.toLowerCase().includes(searchLower)) ||
          (p.restrictions && p.restrictions.toLowerCase().includes(searchLower))
        );
      });
    }

    if (showFree === true) {
      result = result.filter(p => p.isFree || p.monthlyPrice === 0);
    } else if (showFree === false) {
      result = result.filter(p => !p.isFree && p.monthlyPrice > 0);
    }

    if (category === 'per-token') {
      result = result.filter(p => PER_TOKEN_PROVIDERS.includes(p.toolName));
    } else if (category === 'subscription') {
      result = result.filter(p => !PER_TOKEN_PROVIDERS.includes(p.toolName));
    }

    switch (sortBy) {
      case 'score':
        result.sort((a, b) => b.score - a.score);
        break;
      case 'price-asc':
        result.sort((a, b) => a.monthlyPrice - b.monthlyPrice);
        break;
      case 'price-desc':
        result.sort((a, b) => b.monthlyPrice - a.monthlyPrice);
        break;
      case 'name':
        result.sort((a, b) => a.toolName.localeCompare(b.toolName));
        break;
    }

    return result;
  }, [initialPlans, search, showFree, sortBy, category]);

  const plansWithRank = filteredPlans.map((plan, index) => ({
    ...plan,
    rank: index + 1,
  }));

  return (
    <div className="space-y-8">
      <FilterBar 
        plans={initialPlans} 
        search={search}
        setSearch={setSearch}
        showFree={showFree}
        setShowFree={setShowFree}
        sortBy={sortBy}
        setSortBy={setSortBy}
        category={category}
        setCategory={setCategory}
        filteredCount={filteredPlans.length}
      />

      {filteredPlans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 mb-4 rounded-2xl bg-zinc-900/50 border border-white/5 flex items-center justify-center">
            <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-display text-lg font-bold text-white mb-2">No plans found</h3>
          <p className="text-sm text-zinc-500">Try adjusting your filters or search terms</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {plansWithRank.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}
