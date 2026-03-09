import type { PricingModel } from "../schema.js";
import type { ProviderFetcher, ProviderId, ProviderLogger } from "./types.js";
import { fetchOpenAIPricing } from "./openai.js";
import { fetchAnthropicPricing } from "./anthropic.js";
import { fetchGooglePricing } from "./google.js";
import { fetchMistralPricing } from "./mistral.js";
import { fetchDeepseekPricing } from "./deepseek.js";
import { fetchQwenPricing } from "./qwen.js";
import { fetchMoonshotPricing } from "./moonshot.js";
import { fetchMinimaxPricing } from "./minimax.js";
import { fetchZhipuPricing } from "./zhipu.js";

export const providers: Record<ProviderId, ProviderFetcher> = {
  openai: fetchOpenAIPricing,
  anthropic: fetchAnthropicPricing,
  google: fetchGooglePricing,
  mistral: fetchMistralPricing,
  deepseek: fetchDeepseekPricing,
  qwen: fetchQwenPricing,
  moonshot: fetchMoonshotPricing,
  minimax: fetchMinimaxPricing,
  zhipu: fetchZhipuPricing
};

export async function fetchAllProviders(
  logger: (message: string) => void = console.log
): Promise<PricingModel[]> {
  const all: PricingModel[] = [];

  for (const [id, fetcher] of Object.entries(providers) as [ProviderId, ProviderFetcher][]) {
    try {
      logger(`Fetching ${id} pricing...`);
      const providerLogger: ProviderLogger = (message) => logger(`${id}: ${message}`);
      const models = await fetcher(providerLogger);
      all.push(...models);
    } catch (error) {
      logger(`Failed to fetch ${id} pricing: ${(error as Error).message ?? String(error)}`);
    }
  }

  return all;
}
