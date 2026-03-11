import { describe, expect, test } from "vitest";
import { fetchBenchmarkRegistry } from "../../src/benchmarks.js";
import type { PricingModel } from "../../src/schema.js";

describe("benchmarks", () => {
  test("fetchBenchmarkRegistry returns live benchmark results for current tracked models", async () => {
    const pricingModels: PricingModel[] = [
      {
        provider: "openai",
        model: "gpt-5.1-codex",
        type: "text",
        input_price_per_million: 1.5,
        output_price_per_million: 6,
        currency: "USD",
        source: "https://platform.openai.com/pricing"
      },
      {
        provider: "google",
        model: "gemini-2.5-pro",
        type: "text",
        input_price_per_million: 1.25,
        output_price_per_million: 10,
        currency: "USD",
        source: "https://ai.google.dev/pricing"
      },
      {
        provider: "zhipu",
        model: "GLM-5",
        type: "text",
        input_price_per_million: 4,
        output_price_per_million: 18,
        currency: "CNY",
        source: "https://open.bigmodel.cn/pricing"
      }
    ];

    const registry = await fetchBenchmarkRegistry(pricingModels, "2026-03-10T00:00:00.000Z");

    expect(registry.benchmarks.map((entry) => entry.id)).toContain("livebench_overall");
    expect(registry.results.length).toBeGreaterThan(0);
    expect(
      registry.results.some((entry) => entry.provider === "openai" && entry.model === "gpt-5.1-codex")
    ).toBe(true);
    expect(
      registry.results.some((entry) => entry.provider === "zhipu" && entry.model === "GLM-5")
    ).toBe(true);
  }, 60000);
});
