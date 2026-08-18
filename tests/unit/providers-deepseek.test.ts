import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getDeepseekManualFallback, parseDeepseekHtml } from "../../src/providers/deepseek.js";
import { fetchOptionalLiveHtml } from "../helpers/live-html.js";

describe("providers/deepseek", () => {
  test("parseDeepseekHtml parses the official pricing matrix", async () => {
    const fixturePath = resolve(__dirname, "../fixtures/deepseek-pricing.html");
    const html = await readFile(fixturePath, "utf8");

    const models = parseDeepseekHtml(html);

    expect(models).toEqual([
      expect.objectContaining({
        model: "deepseek-chat",
        input_price_per_million: 0.28,
        output_price_per_million: 0.42
      }),
      expect.objectContaining({
        model: "deepseek-chat-cached",
        input_price_per_million: 0.028,
        output_price_per_million: 0.42
      }),
      expect.objectContaining({
        model: "deepseek-reasoner",
        input_price_per_million: 0.28,
        output_price_per_million: 0.42
      }),
      expect.objectContaining({
        model: "deepseek-reasoner-cached",
        input_price_per_million: 0.028,
        output_price_per_million: 0.42
      })
    ]);
  });

  test("getDeepseekManualFallback returns official fallback entries", () => {
    const fallback = getDeepseekManualFallback();
    expect(fallback).toEqual([
      expect.objectContaining({
        model: "deepseek-v4-pro",
        input_price_per_million: 0.22,
        output_price_per_million: 0.66
      }),
      expect.objectContaining({
        model: "deepseek-v4-pro-cached",
        input_price_per_million: 0.007,
        output_price_per_million: 0.66
      })
    ]);
    expect(fallback.every((model) => model.type === "text")).toBe(true);
  });

  test("live pricing page still parses the expected matrix rows", async () => {
    const html = await fetchOptionalLiveHtml("https://api-docs.deepseek.com/quick_start/pricing", {
      validateHtml: (candidate) => parseDeepseekHtml(candidate).length > 0
    });
    if (!html) {
      return;
    }

    const models = parseDeepseekHtml(html);

    expect(models.map((model) => model.model)).toEqual([
      "deepseek-v4-pro",
      "deepseek-v4-pro-cached"
    ]);
    expect(
      models.every(
        (model) =>
          Number.isFinite(model.input_price_per_million) &&
          model.input_price_per_million > 0 &&
          Number.isFinite(model.output_price_per_million) &&
          Number(model.output_price_per_million) > 0
      )
    ).toBe(true);
    const pro = models.find((model) => model.model === "deepseek-v4-pro");
    const proCached = models.find((model) => model.model === "deepseek-v4-pro-cached");
    expect(proCached?.input_price_per_million).toBeLessThan(pro?.input_price_per_million ?? 0);
  }, 30000);
});
