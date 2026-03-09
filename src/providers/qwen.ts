import type { PricingModel } from "../schema.js";

// Official pricing via Alibaba Cloud Model Studio.
const QWEN_PRICING_SOURCE = "https://www.alibabacloud.com/help/en/model-studio/model-pricing";

export async function fetchQwenPricing(): Promise<PricingModel[]> {
  return [
    {
      provider: "qwen",
      model: "qwen-max",
      type: "text",
      input_price_per_million: 1.6,
      output_price_per_million: 6.4,
      currency: "USD",
      source: QWEN_PRICING_SOURCE
    },
    {
      provider: "qwen",
      model: "qwen-turbo",
      type: "text",
      input_price_per_million: 0.05,
      output_price_per_million: 0.2,
      currency: "USD",
      source: QWEN_PRICING_SOURCE
    }
  ];
}
