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

export type ProviderLogger = (message: string) => void;

export type ProviderFetcher = (logger?: ProviderLogger) => Promise<PricingModel[]>;

