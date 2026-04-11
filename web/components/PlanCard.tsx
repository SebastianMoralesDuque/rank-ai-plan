'use client';
import { ExternalLink, Zap, Crown, Sparkles, Check, X, HelpCircle } from 'lucide-react';
import { useState } from 'react';

interface PlanCardProps {
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
  rank?: number;
}

export default function PlanCard({ plan }: { plan: PlanCardProps }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isTopPick = plan.rank === 1;
  const isFreeTier = plan.isFree || plan.monthlyPrice === 0;
  const displayUrl = plan.url || '#';
  
  const offerItems = plan.offers ? plan.offers.split(',').map(o => o.trim()).slice(0, 4) : [];
  const restrictionItems = plan.restrictions ? plan.restrictions.split(',').map(r => r.trim()).slice(0, 3) : [];

  const modelsList: string[] = (() => {
    if (plan.models) {
      try {
        const parsed = JSON.parse(plan.models);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
      return [plan.models];
    }
    if (plan.primaryModel) return [plan.primaryModel];
    return [];
  })();

  return (
    <div 
      className={`
        group relative flex flex-col rounded-2xl border transition-all duration-300
        ${isTopPick 
          ? 'border-blue-500/40 bg-gradient-to-b from-blue-950/30 to-zinc-900/60 shadow-lg shadow-blue-500/10' 
          : 'border-white/5 bg-zinc-900/40 hover:border-white/10'
        }
        hover:-translate-y-1 hover:shadow-xl
      `}
    >
      <div className="flex flex-col h-full p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            {isTopPick && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                <Crown className="h-3 w-3" />
                Top Pick
              </div>
            )}
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-zinc-500 mb-0.5 truncate">
              {plan.toolName}
            </h3>
            <p className="font-display text-lg font-black text-white truncate">
              {plan.planName}
            </p>
          </div>
          
          <div className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-bold flex-shrink-0 ml-2 ${
            isFreeTier 
              ? 'bg-emerald-500/10 text-emerald-400' 
              : 'bg-white/5 text-white'
          }`}>
            {isFreeTier ? (
              <Sparkles className="h-3.5 w-3.5" />
            ) : null}
            <span className="font-display">
              {isFreeTier ? 'FREE' : `$${plan.monthlyPrice}`}
            </span>
            {!isFreeTier && (
              <span className="text-zinc-500 text-xs">/mo</span>
            )}
          </div>
        </div>

        {modelsList.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-1">
              Models
            </p>
            <p className="font-mono text-xs text-zinc-300">
              {modelsList.slice(0, 3).join(', ')}
              {modelsList.length > 3 && ` +${modelsList.length - 3}`}
            </p>
          </div>
        )}

        {offerItems.length > 0 && (
          <div className="mb-3 space-y-1">
            <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">
              Includes
            </p>
            {offerItems.map((offer, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-300 leading-tight">
                  {offer}
                </p>
              </div>
            ))}
          </div>
        )}

        {restrictionItems.length > 0 && (
          <div className="mb-3 space-y-1">
            <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">
              Limits
            </p>
            {restrictionItems.map((restriction, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <X className="h-3 w-3 text-red-500/60 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-500 leading-tight">
                  {restriction}
                </p>
              </div>
            ))}
          </div>
        )}

        {plan.usageLimits && (
          <div className="mb-4 p-2 bg-zinc-800/30 rounded-lg">
            <p className="text-[10px] text-zinc-500">
              {plan.usageLimits}
            </p>
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-white/5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 relative">
              <div 
                className={`
                  flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold cursor-help
                  ${isTopPick ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-zinc-400'}
                `}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <Zap className="h-3 w-3" />
                <span className="tabular-nums">{plan.score.toFixed(0)}</span>
                <span className="text-zinc-500">pts</span>
                <HelpCircle className="h-3 w-3 text-zinc-600" />
              </div>
              
              {showTooltip && plan.scoreBreakdown && plan.scoreBreakdown.length > 0 && (
                <div className="absolute bottom-full left-0 mb-2 z-50 w-64 p-3 bg-zinc-900 border border-white/10 rounded-xl shadow-xl">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Score Breakdown</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Base</span>
                      <span className="text-zinc-300 font-medium">50</span>
                    </div>
                    {plan.scoreBreakdown.map((reason, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-zinc-400">{reason.label}</span>
                        <span className={reason.value >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {reason.value >= 0 ? '+' : ''}{reason.value}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/10 flex justify-between text-xs font-bold">
                    <span className="text-zinc-300">Total</span>
                    <span className={isTopPick ? 'text-blue-400' : 'text-white'}>{plan.score}</span>
                  </div>
                </div>
              )}
            </div>
            
            {displayUrl && displayUrl !== '#' && (
              <a
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-lg"
              >
                Visit
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
