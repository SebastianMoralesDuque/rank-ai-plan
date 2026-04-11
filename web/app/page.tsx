import { PrismaClient } from '@prisma/client';
import PlansGrid from '@/components/PlansGrid';

const prisma = new PrismaClient();

interface ScoreBreakdown {
  total: number;
  reasons: { label: string; value: number }[];
}

function getScoreBreakdown(plan: {
  monthlyPrice: number;
  isFree: boolean;
  offers: string;
  restrictions: string | null;
  primaryModel: string | null;
  models: string | null;
  usageLimits: string | null;
}): ScoreBreakdown {
  let score = 50;
  const reasons: { label: string; value: number }[] = [];

  if (plan.isFree || plan.monthlyPrice === 0) {
    score += 25;
    reasons.push({ label: 'Free tier', value: 25 });
  } else {
    const priceCost = Math.round(plan.monthlyPrice * 0.8);
    score -= priceCost;
    reasons.push({ label: `Price ($${plan.monthlyPrice}/mo)`, value: -priceCost });
  }

  const usageStr = `${plan.offers || ''} ${plan.usageLimits || ''}`.toLowerCase();
  
  if (usageStr.includes('uncapped') || usageStr.includes('unlimited')) {
    score += 20;
    reasons.push({ label: 'Unlimited usage', value: 20 });
  } else if (usageStr.includes('high usage') || usageStr.includes('1m tokens') || usageStr.includes('20m tokens') || usageStr.includes('heavy') || usageStr.includes('sustained')) {
    score += 12;
    reasons.push({ label: 'High usage allowance', value: 12 });
  } else if (usageStr.includes('very limited') || usageStr.includes('50 completions') || usageStr.includes('50 messages')) {
    score -= 12;
    reasons.push({ label: 'Very limited usage', value: -12 });
  } else if (usageStr.includes('200 completions')) {
    score -= 8;
    reasons.push({ label: 'Low request limit', value: -8 });
  } else if (usageStr.includes('limited') && !usageStr.includes('very')) {
    score += 5;
    reasons.push({ label: 'Limited usage', value: 5 });
  }

  if (plan.usageLimits) {
    const limits = plan.usageLimits.toLowerCase();
    if (limits.includes('500 fast')) {
      score += 10;
      reasons.push({ label: '500+ fast requests/day', value: 10 });
    } else if (limits.includes('4500')) {
      score += 8;
      reasons.push({ label: '4,500 requests/5hrs', value: 8 });
    } else if (limits.includes('100 requests') || limits.includes('100k tokens')) {
      score += 3;
      reasons.push({ label: 'Small free tier', value: 3 });
    }
  }

  const premiumModels = ['claude-4.6', 'claude-4.5', 'gpt-5', 'gpt-4o', 'gemini-3.1', 'gemini-3', 'deepseek-v3', 'minimax-m2', 'qwen3', 'glm-5', 'kimi-k2', 'gemma4', 'devstral', 'veo'];
  const modelStr = (plan.models || plan.primaryModel || '').toLowerCase();
  const modelMatches = premiumModels.filter(m => modelStr.includes(m));
  if (modelMatches.length > 0) {
    const modelBonus = Math.min(modelMatches.length * 2, 14);
    score += modelBonus;
    reasons.push({ label: `${modelMatches.length} premium models`, value: modelBonus });
  }

  if (usageStr.includes('agent') || usageStr.includes('200k') || usageStr.includes('500k') || usageStr.includes('1m context')) {
    score += 5;
    reasons.push({ label: 'Large context window', value: 5 });
  }

  if (usageStr.includes('self-hosted') || usageStr.includes('local: uncapped')) {
    score += 10;
    reasons.push({ label: 'Self-hosted unlimited', value: 10 });
  }

  if (plan.restrictions) {
    const r = plan.restrictions.toLowerCase();
    if (r.includes('very limited')) {
      score -= 5;
      reasons.push({ label: 'Very restrictive', value: -5 });
    } else if (r.includes('no team')) {
      score -= 2;
      reasons.push({ label: 'No team features', value: -2 });
    }
  }

  return {
    total: Math.max(0, Math.min(100, Math.round(score))),
    reasons
  };
}

function calculateScore(plan: Parameters<typeof getScoreBreakdown>[0]): number {
  return getScoreBreakdown(plan).total;
}

async function getPlans() {
  const plans = await prisma.aiPlan.findMany({
    select: {
      id: true,
      toolName: true,
      planName: true,
      monthlyPrice: true,
      isFree: true,
      primaryModel: true,
      models: true,
      offers: true,
      restrictions: true,
      usageLimits: true,
      url: true,
      lastUpdated: true,
    }
  });

  return plans.map(plan => {
    const breakdown = getScoreBreakdown(plan);
    return {
      ...plan,
      score: breakdown.total,
      scoreBreakdown: breakdown.reasons,
    };
  });
}

export default async function HomePage() {
  const plans = await getPlans();
  
  const lastUpdate = plans[0]?.lastUpdated 
    ? new Intl.DateTimeFormat('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(plans[0].lastUpdated)
    : 'Unknown';

  return (
    <main className="min-h-screen bg-black text-white selection:bg-blue-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/5 blur-[160px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/5 blur-[160px] rounded-full animate-pulse [animation-delay:2s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-12">
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
              AI Plans <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Ranked</span>
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Best value AI subscriptions • Updated {lastUpdate}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-4 py-2 text-xs font-medium text-zinc-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {plans.length} plans indexed
            </div>
          </div>
        </header>

        <PlansGrid initialPlans={plans} />

        <footer className="mt-20 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <p>
            Data sourced from official pricing pages
          </p>
          <p>© {new Date().getFullYear()} DevAI Rank</p>
        </footer>
      </div>
    </main>
  );
}
