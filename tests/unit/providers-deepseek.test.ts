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
      })
    ]);
  });

  test("getDeepseekManualFallback returns official fallback entries", () => {
    const fallback = getDeepseekManualFallback();
    expect(fallback).toHaveLength(3);
    expect(fallback.every((model) => model.type === "text")).toBe(true);
  });

  test("live pricing page still parses the expected matrix rows", async () => {
    const html = await fetchHtml("https://api-docs.deepseek.com/quick_start/pricing", {
      validateHtml: (candidate) => parseDeepseekHtml(candidate).length > 0
    });
    const models = parseDeepseekHtml(html);

    expect(models.map((model) => model.model)).toEqual([
      "deepseek-chat",
      "deepseek-chat-cached",
      "deepseek-reasoner"
    ]);
    expect(
      models.find((model) => model.model === "deepseek-chat")
    ).toMatchObject({
      input_price_per_million: 1.74,
      output_price_per_million: 3.48
    });
  }, 30000);
});
