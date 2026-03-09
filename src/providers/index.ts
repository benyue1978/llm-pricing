import type { PricingModel } from "../schema.js";
import type { ProviderFetcher, ProviderId } from "./types.js";
import { fetchOpenAIPricing } from "./openai.js";
import { fetchAnthropicPricing } from "./anthropic.js";
import { fetchGooglePricing } from "./google.js";
import { fetchMistralPricing } from "./mistral.js";
import { fetchDeepseekPricing } from "./deepseek.js";

export const providers: Record<ProviderId, ProviderFetcher> = {
  openai: fetchOpenAIPricing,
  anthropic: fetchAnthropicPricing,
  google: fetchGooglePricing,
  mistral: fetchMistralPricing,
  deepseek: fetchDeepseekPricing
};

export async function fetchAllProviders(
  logger: (message: string) => void = console.log
): Promise<PricingModel[]> {
  const all: PricingModel[] = [];

  for (const [id, fetcher] of Object.entries(providers) as [ProviderId, ProviderFetcher][]) {
    try {
      logger(`Fetching ${id} pricing...`);
      const models = await fetcher();
      all.push(...models);
    } catch (error) {
      logger(`Failed to fetch ${id} pricing: ${(error as Error).message ?? String(error)}`);
    }
  }

  return all;
}

