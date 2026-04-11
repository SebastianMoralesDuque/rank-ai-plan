export interface AAModel {
  slug: string;
  name: string;
  model_creator: {
    slug: string;
    name: string;
  };
  pricing?: {
    price_1m_blended_3_to_1?: number;
  };
  evaluations?: {
    artificial_analysis_intelligence_index?: number;
  };
  median_output_tokens_per_second?: number;
  median_time_to_first_token_seconds?: number;
}

export interface DiscoveredProvider {
  domain: string;
  url: string;
  models: string[];
  sourceModel: string;
}

export interface ExtractedPlan {
  planName: string;
  monthlyPrice: number;
  modelsIncluded: string[];
  usageLimits: {
    requests?: string;
    tokens?: string;
    seats?: number;
  };
  features: string[];
}

export interface ScrapedProvider {
  providerName: string;
  url: string;
  plans: ExtractedPlan[];
  sourceModel: string;
}

export interface ScrapedProvider {
  providerName: string;
  url: string;
  plans: ExtractedPlan[];
  sourceModel: string;
}

export interface UsageLimitsDetail {
  requests?: string;
  tokens?: string;
  seats?: number;
}

export interface PlanInput {
  toolName: string;
  planName: string;
  monthlyPrice: number;
  isFree: boolean;
  primaryModel?: string;
  benchmarkScore?: number;
  tokensPerSec?: number;
  offers: string;
  usageLimits?: string;
  modelsIncluded: string[];
  usageLimitsDetail?: UsageLimitsDetail;
  providerUrl?: string;
  url?: string;
  source: string;
}
