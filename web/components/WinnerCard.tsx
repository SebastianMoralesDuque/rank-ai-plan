'use client';
import { Zap } from 'lucide-react';

interface PlanProps {
  toolName: string;
  planName: string;
  monthlyPrice: number;
  offers: string;
  url?: string;
}

export default function WinnerCard({ plan }: { plan: PlanProps }) {
  return (
    <div className="relative group overflow-hidden rounded-[2.5rem] border border-blue-500/20 bg-zinc-950 p-[2px] shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)] transition-all duration-700 hover:border-blue-500/40 hover:shadow-[0_0_80px_-12px_rgba(59,130,246,0.5)]">
      {/* Cinematic Gradient Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10 opacity-50 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative flex flex-col gap-10 rounded-[2.4rem] bg-zinc-950/90 p-10 md:p-14 backdrop-blur-3xl overflow-hidden">
        {/* Animated Glow Spot */}
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blue-500/10 blur-[100px] animate-pulse" />
        
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-6 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.3em] text-blue-400 border border-blue-500/20 shadow-sm shadow-blue-500/20">
              <Zap className="h-3.5 w-3.5 fill-current" />
              Top Rated Selection
            </div>
            
            <div className="space-y-2">
              <h2 className="font-display text-7xl font-black tracking-tighter text-white md:text-8xl leading-[0.9]">
                {plan.toolName} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">{plan.planName}</span>
              </h2>
              <p className="font-body text-xl text-zinc-400 font-medium">The pinnacle of AI-assisted engineering.</p>
            </div>

            <p className="font-body text-lg text-zinc-300 leading-relaxed max-w-xl line-clamp-5 overflow-hidden" title={plan.offers}>
              {plan.offers}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-3xl bg-white/[0.03] border border-white/5 p-10 text-center backdrop-blur-md min-w-[280px] shadow-inner shadow-white/5">
            <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">Investment</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-zinc-500 self-start mt-2">$</span>
              <span className="font-display text-7xl font-black text-white">{plan.monthlyPrice}</span>
              <span className="text-xl font-bold text-zinc-500">/mo</span>
            </div>
            <button 
              onClick={() => plan.url && window.open(plan.url, '_blank')}
              className="mt-10 w-full rounded-2xl bg-blue-600 py-4.5 font-display text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-600/20"
            >
              Unlock Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
