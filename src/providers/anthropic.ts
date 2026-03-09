import type { PricingModel } from "../schema.js";

const ANTHROPIC_PRICING_SOURCE = "https://docs.anthropic.com/claude/docs/models-overview";

export async function fetchAnthropicPricing(): Promise<PricingModel[]> {
  // Static fallback values; real scraping can be added later.
  return [
    {
      provider: "anthropic",
      model: "claude-3-opus",
      input_price_per_million: 15,
      output_price_per_million: 75,
      currency: "USD",
      source: ANTHROPIC_PRICING_SOURCE
    },
    {
      provider: "anthropic",
      model: "claude-3-sonnet",
      input_price_per_million: 3,
      output_price_per_million: 15,
      currency: "USD",
      source: ANTHROPIC_PRICING_SOURCE
    }
  ];
}

