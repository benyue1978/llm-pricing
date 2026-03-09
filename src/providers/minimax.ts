import type { PricingModel } from "../schema.js";

// Official MiniMax pricing overview.
const MINIMAX_PRICING_SOURCE = "https://platform.minimax.io/docs/pricing/overview";

export async function fetchMinimaxPricing(): Promise<PricingModel[]> {
  return [
    {
      provider: "minimax",
      model: "minimax-01",
      type: "text",
      input_price_per_million: 0.2,
      output_price_per_million: 1.1,
      currency: "USD",
      source: MINIMAX_PRICING_SOURCE
    },
    {
      provider: "minimax",
      model: "minimax-m2.5",
      type: "text",
      input_price_per_million: 0.295,
      output_price_per_million: 1.2,
      currency: "USD",
      source: MINIMAX_PRICING_SOURCE
    }
  ];
}
