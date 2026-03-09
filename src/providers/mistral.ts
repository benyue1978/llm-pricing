import type { PricingModel } from "../schema.js";
import { fetchHtml } from "./utils.js";
import type { ProviderLogger } from "./types.js";

const MISTRAL_PRICING_SOURCE = "https://mistral.ai/pricing";

export async function fetchMistralPricing(logger: ProviderLogger = () => {}): Promise<PricingModel[]> {
  try {
    const html = await fetchHtml(MISTRAL_PRICING_SOURCE, {
      validateHtml: (candidate) => parseMistralHtml(candidate).length > 0
    });
    const parsed = parseMistralHtml(html);
    if (parsed.length > 0) {
      logger(`live official pricing page (${parsed.length} models)`);
      return parsed;
    }
  } catch {
    // Fall back to current official values if scraping fails.
  }

  logger(`fallback manual values (${getMistralManualFallback().length} models)`);
  return getMistralManualFallback();
}

export function parseMistralHtml(html: string): PricingModel[] {
  const models: PricingModel[] = [];
  const seen = new Set<string>();
  const matches = [...html.matchAll(/\\?"api(?:_endpoint)?\\?":\\?"([^"\\]+)\\?"/g)];

  for (const match of matches) {
    const modelId = match[1];
    if (!modelId || seen.has(modelId)) {
      continue;
    }

    const block = html.slice(match.index, match.index + 2500);
    const prices = extractUsdAmounts(block);
    if (prices.length < 2) {
      continue;
    }

    seen.add(modelId);
    models.push({
      provider: "mistral",
      model: modelId,
      type: "text",
      input_price_per_million: prices[0],
      output_price_per_million: prices[1],
      currency: "USD",
      source: MISTRAL_PRICING_SOURCE
    });
  }

  return models;
}

function extractUsdAmounts(text: string): number[] {
  return [...text.matchAll(/\$([0-9]+(?:\.[0-9]+)?)/g)]
    .map((match) => Number.parseFloat(match[1]))
    .filter((value) => Number.isFinite(value));
}

export function getMistralManualFallback(): PricingModel[] {
  return [
    {
      provider: "mistral",
      model: "mistral-large-latest",
      type: "text",
      input_price_per_million: 0.5,
      output_price_per_million: 1.5,
      currency: "USD",
      source: MISTRAL_PRICING_SOURCE
    },
    {
      provider: "mistral",
      model: "mistral-medium-latest",
      type: "text",
      input_price_per_million: 0.4,
      output_price_per_million: 2,
      currency: "USD",
      source: MISTRAL_PRICING_SOURCE
    },
    {
      provider: "mistral",
      model: "mistral-small-latest",
      type: "text",
      input_price_per_million: 0.1,
      output_price_per_million: 0.3,
      currency: "USD",
      source: MISTRAL_PRICING_SOURCE
    },
    {
      provider: "mistral",
      model: "codestral-latest",
      type: "text",
      input_price_per_million: 0.3,
      output_price_per_million: 0.9,
      currency: "USD",
      source: MISTRAL_PRICING_SOURCE
    },
    {
      provider: "mistral",
      model: "ministral-8b-latest",
      type: "text",
      input_price_per_million: 0.15,
      output_price_per_million: 0.15,
      currency: "USD",
      source: MISTRAL_PRICING_SOURCE
    },
    {
      provider: "mistral",
      model: "ministral-14b-latest",
      type: "text",
      input_price_per_million: 0.2,
      output_price_per_million: 0.2,
      currency: "USD",
      source: MISTRAL_PRICING_SOURCE
    }
  ];
}
