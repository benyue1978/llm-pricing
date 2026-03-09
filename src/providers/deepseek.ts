import type { PricingModel } from "../schema.js";

const DEEPSEEK_PRICING_SOURCE = "https://api-docs.deepseek.com/quick_start/pricing";

export async function fetchDeepseekPricing(): Promise<PricingModel[]> {
  return [
    {
      provider: "deepseek",
      model: "deepseek-chat",
      input_price_per_million: 0.27,
      output_price_per_million: 0.55,
      currency: "USD",
      source: DEEPSEEK_PRICING_SOURCE
    }
  ];
}

