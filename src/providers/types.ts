import type { PricingModel } from "../schema.js";

export type ProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "mistral"
  | "deepseek"
  | "qwen"
  | "moonshot"
  | "minimax"
  | "zhipu"
  | (string & {});

export type ProviderFetcher = () => Promise<PricingModel[]>;


