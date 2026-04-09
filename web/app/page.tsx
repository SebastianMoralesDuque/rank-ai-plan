import { PrismaClient } from '@prisma/client';
import WinnerCard from '@/components/WinnerCard';
import PlanCard from '@/components/PlanCard';

const prisma = new PrismaClient();

async function getPlans() {
  const plans = await prisma.aiPlan.findMany({
    select: {
      id: true,
      toolName: true,
      planName: true,
      monthlyPrice: true,
      offers: true,
      url: true,
      lastUpdated: true,
    }
  });
  
  // Custom Value Score Logic
  // Fallback domains for tools
  const TOOL_DOMAINS: Record<string, string> = {
    'Cursor': 'https://cursor.com',
    'Github': 'https://github.com',
    'Windsurf': 'https://windsurf.ai',
    'Claude': 'https://anthropic.com',
    'Opencode': 'https://opencode.ai',
    'Minimax': 'https://minimax.io'
  };

  const scoredPlans = plans.map(plan => {
    let score = 50; // Base score
    
    // Offers bonus (replaces models bonus)
    const offers = plan.offers;
    const itemsCount = offers.split(',').length;
    score += itemsCount * 5;
    
    // Key features premium bonus
    const premiumKeywords = ['claude-3.5-sonnet', 'gpt-4o', 'o1-pro', 'frontier models', 'premium models', 'unlimited'];
    if (premiumKeywords.some(kw => offers.toLowerCase().includes(kw))) score += 30;

    // Price penalty
    score -= (plan.monthlyPrice * 1.5);
    
    // URL fallback
    let planUrl = plan.url;
    if (!planUrl || planUrl.trim() === '') {
      planUrl = TOOL_DOMAINS[plan.toolName] || '';
    }

    return { 
      ...plan, 
      score,
      url: planUrl
    };
  }).filter(plan => plan.url && plan.url.trim() !== ''); // Only show plans with URLs

  // Sort by score descending
  return scoredPlans.sort((a, b) => b.score - a.score);
}

export default async function HomePage() {
  const plans = await getPlans();
  const winner = plans[0];
  const paidPlans = plans.filter(p => p.monthlyPrice > 0 && p.id !== winner?.id);
  const freePlans = plans.filter(p => p.monthlyPrice === 0 && p.id !== winner?.id);
  
  const currentMonth = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date());

  return (
    <main className="min-h-screen bg-black text-white selection:bg-blue-500/30 overflow-x-hidden">
      {/* Cinematic Background Atmosphere */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/5 blur-[160px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/5 blur-[160px] rounded-full animate-pulse [animation-delay:2s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-8">
        {/* Header / Nav Placeholder */}
        <nav className="flex items-center justify-between mb-32 opacity-0 animate-[fade-in_1s_ease-out_forwards]">
          <div className="font-display text-2xl font-black italic tracking-tighter">
            DEVAI<span className="text-blue-500">RANK</span>
          </div>
          <div className="flex gap-8 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
            <span className="text-white">Directory</span>
            <span className="hover:text-white transition-colors cursor-pointer">Stats</span>
            <span className="hover:text-white transition-colors cursor-pointer">About</span>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative text-center space-y-8 mb-40 opacity-0 animate-[fade-in_1s_ease-out_0.2s_forwards]">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/5 bg-white/[0.02] px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 backdrop-blur-sm shadow-xl shadow-blue-500/5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Live Data Feed • {currentMonth}
          </div>
          
          <h1 className="font-display text-6xl font-black tracking-tight text-white sm:text-8xl md:text-9xl leading-[0.85] max-w-5xl mx-auto">
            The Gold Standard of <span className="text-transparent bg-clip-text bg-gradient-to-b from-blue-400 to-indigo-600">AI Logic.</span>
          </h1>
          
          <p className="font-body mx-auto max-w-2xl text-xl text-zinc-500 font-medium leading-relaxed">
            Curated intelligence benchmarks for modern engineers. 
            We rank costs, frontier benchmarks, and limits so you don't have to.
          </p>
        </section>

        {/* Top Product Section */}
        {winner && (
          <section className="mb-48 opacity-0 animate-[fade-in_1s_ease-out_0.4s_forwards]">
            <div className="flex flex-col items-center mb-12">
              <div className="h-12 w-px bg-gradient-to-b from-transparent to-blue-500/50 mb-6" />
              <h2 className="font-display text-sm font-black uppercase tracking-[0.4em] text-zinc-500">Monthly Champion</h2>
            </div>
            <WinnerCard plan={winner} />
          </section>
        )}

        {/* Paid Plans Grid */}
        {paidPlans.length > 0 && (
          <section className="mb-40 opacity-0 animate-[fade-in_1s_ease-out_0.6s_forwards]">
            <div className="flex items-end justify-between mb-12">
              <div>
                <h3 className="font-display text-4xl font-black text-white mb-2">Pro Tiers</h3>
                <p className="font-body text-zinc-500 font-medium">High performance setups for scaling production.</p>
              </div>
              <div className="hidden md:block h-px flex-1 mx-12 bg-zinc-900" />
              <span className="text-xs font-black uppercase tracking-widest text-zinc-700">{paidPlans.length} Results</span>
            </div>
            
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {paidPlans.map((plan, i) => (
                <div key={plan.id} className="opacity-0 animate-[fade-in_0.8s_ease-out_forwards]" style={{ animationDelay: `${0.8 + (i * 0.1)}s` }}>
                  <PlanCard plan={plan} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Free Plans Grid */}
        {freePlans.length > 0 && (
          <section className="opacity-0 animate-[fade-in_1s_ease-out_0.8s_forwards]">
            <div className="flex items-end justify-between mb-12">
              <div>
                <h3 className="font-display text-4xl font-black text-white mb-2">Free & Hobby</h3>
                <p className="font-body text-zinc-500 font-medium">Essential entry points for exploration and side projects.</p>
              </div>
              <div className="hidden md:block h-px flex-1 mx-12 bg-zinc-900 shadow-sm shadow-blue-500/5" />
              <span className="text-xs font-black uppercase tracking-widest text-zinc-700">{freePlans.length} Results</span>
            </div>
            
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {freePlans.map((plan, i) => (
                <div key={plan.id} className="opacity-0 animate-[fade-in_0.8s_ease-out_forwards]" style={{ animationDelay: `${1.0 + (i * 0.1)}s` }}>
                  <PlanCard plan={plan} />
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-48 py-20 border-t border-white/5 flex flex-col items-center gap-8 opacity-0 animate-[fade-in_1s_ease-out_1.2s_forwards]">
          <div className="font-display text-xl font-black italic tracking-tighter opacity-30">
            DEVAI<span className="text-blue-500">RANK</span>
          </div>
          <p className="font-body text-xs text-zinc-600 font-bold uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} ARCHIVED INTELLIGENCE DATA
          </p>
        </footer>
      </div>
    </main>
  );
}
