import type { PricingModel } from "../schema.js";

// Official Zhipu Z.AI developer pricing.
const ZHIPU_PRICING_SOURCE = "https://zhipu-32152247.mintlify.app/guides/overview/pricing";

export async function fetchZhipuPricing(): Promise<PricingModel[]> {
  return [
    {
      provider: "zhipu",
      model: "glm-4.5-air",
      type: "text",
      input_price_per_million: 0.2,
      output_price_per_million: 1.1,
      currency: "USD",
      source: ZHIPU_PRICING_SOURCE
    },
    {
      provider: "zhipu",
      model: "glm-5",
      type: "text",
      input_price_per_million: 0.8,
      output_price_per_million: 2.56,
      currency: "USD",
      source: ZHIPU_PRICING_SOURCE
    }
  ];
}
