import { tavily } from '@tavily/core';
import { AAModel, DiscoveredProvider, ExtractedPlan, ScrapedProvider } from './types';

const AA_API_URL = 'https://artificialanalysis.ai/api/v2/data/llms/models';

const MODEL_CREATOR_MAP: Record<string, string> = {
  'anthropic': 'Claude',
  'openai': 'OpenAI',
  'google': 'Google',
  'meta': 'Meta',
  'mistral': 'Mistral',
  'x-ai': 'xAI',
  'deepseek': 'DeepSeek',
  'perplexity': 'Perplexity',
  'amazon': 'Amazon',
  'cohere': 'Cohere',
  'apple': 'Apple',
  'qwen': 'Qwen',
  '01-ai': '01.AI',
  'inference': 'Inference Labs',
  'moonshot': 'Moonshot',
  'stepfun': 'StepFun',
  'zhipuai': 'ZhipuAI',
  'cyberon': 'Cyberon',
  'minimax': 'Minimax',
  'groq': 'Groq',
  'fireworks': 'Fireworks',
  'nebius': 'Nebius',
  'novita': 'Novita',
  'sambanova': 'SambaNova',
};

const BLACKLISTED_DOMAINS = new Set([
  'github.com',
  'huggingface.co',
  'arxiv.org',
  'wikipedia.org',
  'youtube.com',
  'twitter.com',
  'x.com',
  'reddit.com',
  'discord.com',
  'linkedin.com',
  'stackoverflow.com',
]);

export async function fetchTopModels(limit: number = 15): Promise<AAModel[]> {
  const apiKey = process.env.ARTIFICIAL_ANALYSIS_API_KEY;
  
  if (!apiKey) {
    console.log('ARTIFICIAL_ANALYSIS_API_KEY not set');
    return [];
  }

  console.log('Fetching models from Artificial Analysis API...');
  
  const response = await fetch(AA_API_URL, {
    headers: {
      'x-api-key': apiKey,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`AA API error: ${response.status}`);
  }

  const result = await response.json();
  const models: AAModel[] = result.data || [];

  console.log(`Fetched ${models.length} models from AA API`);

  const sortedModels = models
    .filter(m => m.evaluations?.artificial_analysis_intelligence_index && m.evaluations.artificial_analysis_intelligence_index > 30)
    .sort((a, b) => (b.evaluations?.artificial_analysis_intelligence_index || 0) - (a.evaluations?.artificial_analysis_intelligence_index || 0))
    .slice(0, limit);

  console.log(`\nTop ${sortedModels.length} models by intelligence index:`);
  sortedModels.forEach(m => {
    console.log(`  - ${m.name}: ${m.evaluations?.artificial_analysis_intelligence_index}`);
  });

  return sortedModels;
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function normalizeToolName(domain: string): string {
  const domainLower = domain.toLowerCase();
  
  const mappings: Record<string, string> = {
    'cursor.com': 'Cursor',
    'github.com': 'GitHub Copilot',
    'copilot.microsoft.com': 'GitHub Copilot',
    'windsurf.ai': 'Windsurf',
    'anthropic.com': 'Claude',
    'claude.ai': 'Claude',
    'openai.com': 'OpenAI',
    'chatgpt.com': 'OpenAI',
    'google.com': 'Google',
    'gemini.google.com': 'Google',
    'deepseek.com': 'DeepSeek',
    'platform.deepseek.com': 'DeepSeek',
    'mistral.ai': 'Mistral',
    'meta.ai': 'Meta',
    'ai.meta.com': 'Meta',
    'x.ai': 'xAI',
    'grok.com': 'xAI',
    'perplexity.ai': 'Perplexity',
    'opencode.ai': 'Opencode',
    'minimax.io': 'Minimax',
    'qwen.ai': 'Qwen',
    'tongyi.aliyun.com': 'Alibaba',
    'aliyun.com': 'Alibaba',
    'volcengine.com': 'Volcengine',
    'byteplus.com': 'BytePlus',
    'groq.com': 'Groq',
    'cloudflare.com': 'Cloudflare',
    'aws.amazon.com': 'AWS',
    'azure.microsoft.com': 'Azure',
    'novita.ai': 'Novita',
    'sambanova.ai': 'SambaNova',
    'fireworks.ai': 'Fireworks',
    'nebius.ai': 'Nebius',
    'together.ai': 'Together',
    'replicate.com': 'Replicate',
    'cohere.com': 'Cohere',
    'kimi.moonshot.cn': 'Kimi',
    'moonshot.cn': 'Kimi',
    'yi.ai': 'Yi',
    'zhipuai.cn': 'ZhipuAI',
  };

  for (const [key, value] of Object.entries(mappings)) {
    if (domainLower.includes(key)) {
      return value;
    }
  }

  const parts = domainLower.split('.');
  if (parts.length >= 2) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  
  return domain;
}

interface TavilyResult {
  url: string;
  title: string;
  content: string;
  score: number;
}

interface TavilySearchResponse {
  query: string;
  answer: string;
  results: TavilyResult[];
}

async function searchWithTavily(modelName: string): Promise<TavilySearchResponse | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  
  if (!apiKey) {
    console.log('TAVILY_API_KEY not set');
    return null;
  }

  const client = tavily({ apiKey });

  try {
    console.log(`  Searching Tavily for: "${modelName}"`);
    
    const response = await client.search(modelName, {
      includeAnswer: 'advanced',
      searchDepth: 'advanced',
      maxResults: 10,
    });

    return response as TavilySearchResponse;

  } catch (error) {
    console.warn(`  Tavily error:`, error);
    return null;
  }
}

function extractPlansFromTavilyAnswer(
  answer: string, 
  results: TavilyResult[],
  modelName: string
): ExtractedPlan[] {
  const plans: ExtractedPlan[] = [];
  
  const modelInAnswer = modelName.toLowerCase();

  const providers = new Map<string, TavilyResult>();
  for (const result of results) {
    const domain = extractDomain(result.url);
    if (!BLACKLISTED_DOMAINS.has(domain) && !providers.has(domain)) {
      providers.set(domain, result);
    }
  }

  for (const [domain, result] of Array.from(providers.entries())) {
    const toolName = normalizeToolName(domain);
    const content = (result.content || '') + ' ' + answer;
    
    const prices = content.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:\/mo|per\s*month|monthly)?/gi) || [];
    const filteredPrices = prices
      .map(p => {
        const match = p.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
        return match ? parseFloat(match[1].replace(',', '')) : null;
      })
      .filter((p): p is number => p !== null && p > 0 && p <= 500);

    const uniquePrices = Array.from(new Set(filteredPrices));

    const planNames = content.match(/(?:plan|tier|subscription)\s*:?\s*([A-Za-z0-9\s+\-]+?)(?:\s*\$|\s*,|\n|$)/gi) || [];

    for (let i = 0; i < Math.min(uniquePrices.length, 5); i++) {
      const price = uniquePrices[i];
      let planName = `Plan ${i + 1}`;
      
      if (planNames[i]) {
        planName = planNames[i].replace(/(?:plan|tier|subscription)\s*:?\s*/gi, '').trim();
        planName = planName.replace(/[^a-zA-Z0-9\s\-+]/g, '').trim();
      }

      plans.push({
        planName: planName || `Plan ${i + 1}`,
        monthlyPrice: price,
        modelsIncluded: [modelInAnswer],
        usageLimits: {},
        features: [],
      });
    }

    if (uniquePrices.length === 0 && content.match(/free|no cost|\$0/gi)) {
      plans.push({
        planName: 'Free',
        monthlyPrice: 0,
        modelsIncluded: [modelInAnswer],
        usageLimits: { requests: 'Limited' },
        features: ['Free tier'],
      });
    }
  }

  return plans;
}

export async function discoverAndExtractPlans(models: AAModel[]): Promise<ScrapedProvider[]> {
  console.log('\n' + '='.repeat(60));
  console.log('AGENTIC DISCOVERY: Searching and extracting plans');
  console.log('='.repeat(60));

  const allResults: ScrapedProvider[] = [];
  const seenProviders = new Set<string>();

  for (const model of models) {
    const modelName = model.name || model.slug;
    
    console.log(`\nProcessing: ${modelName}`);
    
    const tavilyResult = await searchWithTavily(modelName);
    
    if (!tavilyResult || tavilyResult.results.length === 0) {
      console.log(`  No results found`);
      continue;
    }

    console.log(`  Found ${tavilyResult.results.length} sources`);
    console.log(`  AI Answer: ${tavilyResult.answer?.slice(0, 200)}...`);

    const providers = new Map<string, { result: TavilyResult; model: string }>();
    
    for (const result of tavilyResult.results) {
      const domain = extractDomain(result.url);
      
      if (BLACKLISTED_DOMAINS.has(domain)) continue;
      
      if (!providers.has(domain)) {
        providers.set(domain, { result, model: modelName });
      }
    }

    for (const [domain, { result, model }] of Array.from(providers.entries())) {
      if (seenProviders.has(domain)) continue;
      seenProviders.add(domain);

      const toolName = normalizeToolName(domain);
      const content = result.content || '';
      const fullContent = content + ' ' + (tavilyResult.answer || '');

      const plans = extractPlansFromAnswer(fullContent, toolName, model);

      if (plans.length > 0) {
        allResults.push({
          providerName: toolName,
          url: result.url,
          plans,
          sourceModel: model,
        });

        console.log(`  ✓ ${toolName}: ${plans.length} plans`);
        for (const plan of plans) {
          console.log(`    - ${plan.planName}: $${plan.monthlyPrice}/mo`);
        }
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Discovery complete: ${allResults.length} providers with plans`);
  console.log('='.repeat(60));

  return allResults;
}

function extractPlansFromAnswer(content: string, providerName: string, modelName: string): ExtractedPlan[] {
  const plans: ExtractedPlan[] = [];

  const pricePattern = /\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:\/mo|\/month|per\s*month|monthly)?/gi;
  const planNamePattern = /(?:plan|tier|option|subscription)\s*:?\s*([A-Za-z0-9\s+\-]+?)(?:\s*(?:\$|\d)|,|\n|$)/gi;

  const priceMatches = Array.from(content.matchAll(pricePattern));
  const nameMatches = Array.from(content.matchAll(planNamePattern));

  const prices = priceMatches
    .map(m => {
      const val = parseFloat(m[1].replace(',', ''));
      return val > 0 && val <= 500 ? val : null;
    })
    .filter((p): p is number => p !== null);

  const uniquePrices = Array.from(new Set(prices));

  for (let i = 0; i < Math.min(uniquePrices.length, 5); i++) {
    const price = uniquePrices[i];
    let planName = nameMatches[i]?.[1]?.trim() || `Plan ${i + 1}`;
    
    planName = planName.replace(/[^a-zA-Z0-9\s\-+]/g, '').trim();
    
    if (!planName || planName.length < 2) {
      planName = `Plan ${i + 1}`;
    }

    const plan: ExtractedPlan = {
      planName,
      monthlyPrice: price,
      modelsIncluded: [modelName],
      usageLimits: {},
      features: [],
    };

    if (content.toLowerCase().includes('unlimited')) {
      plan.usageLimits.requests = 'Unlimited';
    }

    const thinkingMatch = content.match(/(\d+)\s*(?:thinking\s*)?messages?\s*(?:\/|per)\s*(?:3\s*h|hour)/i);
    if (thinkingMatch) {
      plan.usageLimits.requests = `${thinkingMatch[1]} messages/3h`;
    }

    plans.push(plan);
  }

  if (plans.length === 0) {
    if (content.match(/free|no cost|\$0/gi)) {
      plans.push({
        planName: 'Free',
        monthlyPrice: 0,
        modelsIncluded: [modelName],
        usageLimits: { requests: 'Limited' },
        features: ['Free tier'],
      });
    }
  }

  return plans;
}

export async function discoverProvidersForModels(models: AAModel[]): Promise<DiscoveredProvider[]> {
  return [];
}
