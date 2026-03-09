import { describe, expect, test } from "vitest";
import { fetchOpenAIPricing } from "../../src/providers/openai.js";
import { fetchAnthropicPricing } from "../../src/providers/anthropic.js";
import { fetchGooglePricing } from "../../src/providers/google.js";
import { fetchMistralPricing } from "../../src/providers/mistral.js";
import { fetchDeepseekPricing } from "../../src/providers/deepseek.js";
import { fetchQwenPricing } from "../../src/providers/qwen.js";
import { fetchMoonshotPricing } from "../../src/providers/moonshot.js";
import { fetchMinimaxPricing } from "../../src/providers/minimax.js";
import { fetchZhipuPricing } from "../../src/providers/zhipu.js";
import { assertValidPricingModels } from "../helpers/assert-pricing.js";

describe("provider fetchers", () => {
  test("openai returns valid pricing models (live or fallback)", async () => {
    // Allow skipping the live OpenAI call in constrained environments.
    if (process.env.SKIP_OPENAI_LIVE === "1") {
      return;
    }

    const models = await fetchOpenAIPricing();
    assertValidPricingModels(models);
    expect(models.every((model) => model.type === "text")).toBe(true);
  });

  test("anthropic returns valid pricing models", async () => {
    const models = await fetchAnthropicPricing();
    assertValidPricingModels(models);
  }, 15000);

  test("google returns valid pricing models", async () => {
    const models = await fetchGooglePricing();
    assertValidPricingModels(models);
  }, 30000);

  test("mistral returns valid pricing models", async () => {
    const models = await fetchMistralPricing();
    assertValidPricingModels(models);
  }, 30000);

  test("deepseek returns valid pricing models", async () => {
    const models = await fetchDeepseekPricing();
    assertValidPricingModels(models);
  });

  test("qwen returns valid pricing models", async () => {
    const models = await fetchQwenPricing();
    assertValidPricingModels(models);
  }, 30000);

  test("moonshot returns valid pricing models", async () => {
    const models = await fetchMoonshotPricing();
    assertValidPricingModels(models);
  }, 90000);

  test("minimax returns valid pricing models", async () => {
    const models = await fetchMinimaxPricing();
    assertValidPricingModels(models);
  }, 30000);

  test("zhipu returns valid pricing models", async () => {
    const models = await fetchZhipuPricing();
    assertValidPricingModels(models);
  }, 30000);
});
