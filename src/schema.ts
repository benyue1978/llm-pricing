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

export interface CurrencyRateRegistry {
  updated_at: string;
  source: string;
  base_currency: string;
  rates: Record<string, number>;
}

export interface RegistrySource {
  id: string;
  name: string;
  kind: "provider_docs" | "provider_api" | "huggingface_model_card" | "benchmark_official" | "paper" | string;
  url: string;
  official: boolean;
  scope: "metadata" | "benchmark" | "pricing" | string;
  notes?: string;
}

export interface ModelCatalogEntry {
  provider: string;
  model: string;
  family: string;
  access_type: "api" | "open-weight" | "hosted-open-weight" | "unknown";
  openness: "closed" | "open-weight" | "open-weights-available" | "unknown";
  modalities: string[];
  comparison_buckets: string[];
  release_stage: "stable" | "preview" | "experimental" | "deprecated" | "unknown";
  context_window_tokens: number | null;
  max_output_tokens: number | null;
  parameter_count_billions: number | null;
  license: string | null;
  model_page_url: string | null;
  metadata_source_ids: string[];
  pricing_source_url: string;
  benchmark_ids: string[];
  notes: string[];
}

export interface ModelCatalogRegistry {
  updated_at: string;
  sources: RegistrySource[];
  models: ModelCatalogEntry[];
}

export interface BenchmarkDefinition {
  id: string;
  name: string;
  category: "general" | "coding" | "coding-agent" | "tool-use" | "reasoning" | string;
  maintainer: string;
  metric_name: string;
  score_direction: "higher_is_better" | "lower_is_better";
  source_url: string;
  docs_url: string;
  applicable_modalities: string[];
  suitable_for_normalized_price: boolean;
  notes: string;
}

export interface BenchmarkScore {
  provider: string;
  model: string;
  benchmark_id: string;
  score: number;
  score_unit: string;
  evaluated_at: string | null;
  source_url: string;
  benchmark_model: string | null;
  matched_benchmark_models: string[];
  notes: string | null;
}

export interface BenchmarkRegistry {
  updated_at: string;
  sources: RegistrySource[];
  benchmarks: BenchmarkDefinition[];
  results: BenchmarkScore[];
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

export function createEmptyCurrencyRateRegistry(): CurrencyRateRegistry {
  return {
    updated_at: new Date(0).toISOString(),
    source: "",
    base_currency: "EUR",
    rates: {}
  };
}

export function createEmptyModelCatalogRegistry(): ModelCatalogRegistry {
  return {
    updated_at: new Date(0).toISOString(),
    sources: [],
    models: []
  };
}

export function createEmptyBenchmarkRegistry(): BenchmarkRegistry {
  return {
    updated_at: new Date(0).toISOString(),
    sources: [],
    benchmarks: [],
    results: []
  };
}
