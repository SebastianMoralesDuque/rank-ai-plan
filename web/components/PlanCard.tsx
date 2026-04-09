'use client';
import { Check, Cpu, Zap } from 'lucide-react';

interface PlanProps {
  toolName: string;
  planName: string;
  monthlyPrice: number;
  offers: string;
  url?: string;
}

export default function PlanCard({ plan }: { plan: PlanProps }) {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-white/5 bg-zinc-900/40 p-1 shadow-2xl transition-all duration-500 hover:border-blue-500/30 hover:shadow-blue-500/10 hover:-translate-y-1">
      <div className="flex flex-col h-full rounded-[0.9rem] bg-zinc-900/80 p-6 backdrop-blur-xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-blue-500/80 mb-1">{plan.toolName}</h3>
            <p className="font-display text-2xl font-black text-white leading-tight">{plan.planName}</p>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-0.5 justify-end">
              <span className="text-sm font-medium text-zinc-500">$</span>
              <span className="font-display text-3xl font-black text-white">{plan.monthlyPrice}</span>
            </div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">per month</p>
          </div>
        </div>
        
        <div className="flex flex-col gap-3 py-6 min-h-[120px]">
          <p className="font-body text-zinc-400 text-sm leading-relaxed line-clamp-4 overflow-hidden" title={plan.offers}>
            {plan.offers}
          </p>
        </div>

        <button 
          onClick={() => plan.url && window.open(plan.url, '_blank')}
          className="mt-auto w-full rounded-xl bg-white/5 border border-white/10 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-white/10 hover:border-white/20 active:scale-95"
        >
          See Details
        </button>
      </div>
    </div>
  );
}
