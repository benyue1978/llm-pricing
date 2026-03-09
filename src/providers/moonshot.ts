import type { PricingModel } from "../schema.js";

// Official Moonshot / Kimi docs (pricing is described across guides).
const MOONSHOT_PRICING_SOURCE = "https://platform.moonshot.ai";

export async function fetchMoonshotPricing(): Promise<PricingModel[]> {
  return [
    {
      provider: "moonshot",
      model: "kimi-k2.5",
      type: "text",
      input_price_per_million: 0.45,
      output_price_per_million: 2.2,
      currency: "USD",
      source: MOONSHOT_PRICING_SOURCE
    },
    {
      provider: "moonshot",
      model: "kimi-k2",
      type: "text",
      input_price_per_million: 0.4,
      output_price_per_million: 2,
      currency: "USD",
      source: MOONSHOT_PRICING_SOURCE
    }
  ];
}
