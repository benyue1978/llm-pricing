// Pricing schema definitions will be implemented in the next todo.

export interface PricingModel {
  provider: string;
  model: string;
  /**
   * High-level billing category for the model entry.
   */
  type: "text" | "image" | "audio" | "embedding" | "tool" | string;
  /**
   * Price per 1M input tokens in USD.
   */
  input_price_per_million: number;
  /**
   * Price per 1M output tokens in USD. Null if not applicable.
   */
  output_price_per_million: number | null;
  /**
   * Currency code, typically "USD".
   */
  currency: "USD" | string;
  /**
   * Source URL or description for this pricing entry.
   */
  source: string;
}

export interface PricingRegistry {
  /**
   * ISO8601 timestamp when this registry was last updated.
   */
  updated_at: string;
  models: PricingModel[];
}

export function createEmptyRegistry(): PricingRegistry {
  return {
    updated_at: new Date(0).toISOString(),
    models: []
  };
}
