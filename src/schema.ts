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

export interface ProviderOpsStatus {
  provider: string;
  success: boolean;
  mode: "live" | "fallback" | "failed" | "unknown";
  model_count: number;
  started_at: string;
  finished_at: string;
  checked_at: string;
  duration_ms: number;
  message: string | null;
  messages: string[];
  fail_reason: string | null;
}

export interface OpsRegistry {
  updated_at: string;
  summary: {
    provider_count: number;
    success_count: number;
    failure_count: number;
    live_count: number;
    fallback_count: number;
    model_count: number;
  };
  providers: ProviderOpsStatus[];
}

export function createEmptyRegistry(): PricingRegistry {
  return {
    updated_at: new Date(0).toISOString(),
    models: []
  };
}

export function createEmptyOpsRegistry(): OpsRegistry {
  return {
    updated_at: new Date(0).toISOString(),
    summary: {
      provider_count: 0,
      success_count: 0,
      failure_count: 0,
      live_count: 0,
      fallback_count: 0,
      model_count: 0
    },
    providers: []
  };
}
