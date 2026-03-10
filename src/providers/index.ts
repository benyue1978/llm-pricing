import type { PricingModel, ProviderOpsStatus } from "../schema.js";
import type { FetchAllProvidersResult, ProviderFetcher, ProviderId, ProviderLogger } from "./types.js";
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
  const result = await fetchAllProvidersDetailed(logger);
  return result.models;
}

export async function fetchAllProvidersDetailed(
  logger: (message: string) => void = console.log
): Promise<FetchAllProvidersResult> {
  const all: PricingModel[] = [];
  const providerStatuses: ProviderOpsStatus[] = [];

  for (const [id, fetcher] of Object.entries(providers) as [ProviderId, ProviderFetcher][]) {
    const startedAt = new Date();
    const messages: string[] = [];
    try {
      logger(`Fetching ${id} pricing...`);
      const providerLogger: ProviderLogger = (message) => {
        messages.push(message);
        logger(`${id}: ${message}`);
      };
      const models = await fetcher(providerLogger);
      const finishedAt = new Date();
      all.push(...models);
      providerStatuses.push({
        provider: id,
        success: true,
        mode: inferProviderMode(messages.at(-1)),
        model_count: models.length,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        checked_at: finishedAt.toISOString(),
        duration_ms: finishedAt.getTime() - startedAt.getTime(),
        message: messages.at(-1) ?? null,
        messages,
        fail_reason: null
      });
    } catch (error) {
      const finishedAt = new Date();
      const failReason = (error as Error).message ?? String(error);
      logger(`Failed to fetch ${id} pricing: ${failReason}`);
      providerStatuses.push({
        provider: id,
        success: false,
        mode: "failed",
        model_count: 0,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        checked_at: finishedAt.toISOString(),
        duration_ms: finishedAt.getTime() - startedAt.getTime(),
        message: messages.at(-1) ?? null,
        messages,
        fail_reason: failReason
      });
    }
  }

  return {
    models: all,
    providerStatuses
  };
}

function inferProviderMode(message: string | undefined): ProviderOpsStatus["mode"] {
  const normalized = message?.toLowerCase() ?? "";
  if (normalized.startsWith("live")) {
    return "live";
  }
  if (normalized.startsWith("fallback")) {
    return "fallback";
  }
  return "unknown";
}
