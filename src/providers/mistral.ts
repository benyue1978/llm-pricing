import type { PricingModel } from "../schema.js";

const MISTRAL_PRICING_SOURCE = "https://docs.mistral.ai/platform/pricing/";

export async function fetchMistralPricing(): Promise<PricingModel[]> {
  return [
    {
      provider: "mistral",
      model: "mistral-large",
      input_price_per_million: 8,
      output_price_per_million: 24,
      currency: "USD",
      source: MISTRAL_PRICING_SOURCE
    },
    {
      provider: "mistral",
      model: "mistral-small",
      input_price_per_million: 2,
      output_price_per_million: 6,
      currency: "USD",
      source: MISTRAL_PRICING_SOURCE
    }
  ];
}

