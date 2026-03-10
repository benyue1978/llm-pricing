import type { PricingModel } from "../../schema.js";

export interface CreateTextPricingModelOptions {
  provider: string;
  model: string;
  input: number;
  output: number | null;
  currency: string;
  source: string;
}

export function createTextPricingModel({
  provider,
  model,
  input,
  output,
  currency,
  source
}: CreateTextPricingModelOptions): PricingModel {
  return {
    provider,
    model,
    type: "text",
    input_price_per_million: input,
    output_price_per_million: output,
    currency,
    source
  };
}
