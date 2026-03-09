import type { PricingModel } from "../schema.js";

const GOOGLE_PRICING_SOURCE = "https://ai.google.dev/pricing";

export async function fetchGooglePricing(): Promise<PricingModel[]> {
  return [
    {
      provider: "google",
      model: "gemini-1.5-pro",
      input_price_per_million: 3.5,
      output_price_per_million: 10.5,
      currency: "USD",
      source: GOOGLE_PRICING_SOURCE
    },
    {
      provider: "google",
      model: "gemini-1.5-flash",
      input_price_per_million: 0.35,
      output_price_per_million: 1.05,
      currency: "USD",
      source: GOOGLE_PRICING_SOURCE
    }
  ];
}

