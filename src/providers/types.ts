import type { PricingModel } from "../schema.js";

export type ProviderId = "openai" | "anthropic" | "google" | "mistral" | "deepseek" | (string & {});

export type ProviderFetcher = () => Promise<PricingModel[]>;

