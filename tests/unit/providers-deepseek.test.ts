import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getDeepseekManualFallback, parseDeepseekHtml } from "../../src/providers/deepseek.js";
import { fetchHtml } from "../../src/providers/utils.js";

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
    expect(fallback.map((model) => model.model)).toEqual([
      "deepseek-v4-flash",
      "deepseek-v4-flash-cached",
      "deepseek-v4-pro",
      "deepseek-v4-pro-cached"
    ]);
    expect(fallback.every((model) => model.type === "text")).toBe(true);
  });

  test("live pricing page still parses the expected matrix rows", async () => {
    const html = await fetchHtml("https://api-docs.deepseek.com/quick_start/pricing", {
      validateHtml: (candidate) => parseDeepseekHtml(candidate).length > 0
    });
    const models = parseDeepseekHtml(html);

    expect(models.map((model) => model.model)).toEqual([
      "deepseek-v4-flash",
      "deepseek-v4-flash-cached",
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
    const flash = models.find((model) => model.model === "deepseek-v4-flash");
    const flashCached = models.find((model) => model.model === "deepseek-v4-flash-cached");
    const pro = models.find((model) => model.model === "deepseek-v4-pro");
    const proCached = models.find((model) => model.model === "deepseek-v4-pro-cached");
    expect(flashCached?.input_price_per_million).toBeLessThan(flash?.input_price_per_million ?? 0);
    expect(proCached?.input_price_per_million).toBeLessThan(pro?.input_price_per_million ?? 0);
  }, 30000);
});
