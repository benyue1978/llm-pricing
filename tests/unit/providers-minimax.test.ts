import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getMinimaxManualFallback, parseMinimaxHtml } from "../../src/providers/minimax.js";
import { fetchHtml } from "../../src/providers/utils.js";

describe("providers/minimax", () => {
  test("parseMinimaxHtml parses the pay-as-you-go text pricing table", async () => {
    const fixturePath = resolve(__dirname, "../fixtures/minimax-pricing.html");
    const html = await readFile(fixturePath, "utf8");

    const models = parseMinimaxHtml(html);

    expect(models).toHaveLength(6);
    expect(models.find((model) => model.model === "MiniMax-M2.5")).toMatchObject({
      input_price_per_million: 0.3,
      output_price_per_million: 1.2
    });
    expect(models.find((model) => model.model === "MiniMax-M2.5-highspeed")).toMatchObject({
      input_price_per_million: 0.6,
      output_price_per_million: 2.4
    });
  });

  test("getMinimaxManualFallback returns current official text models", () => {
    const fallback = getMinimaxManualFallback();
    expect(fallback.map((model) => model.model)).toContain("MiniMax-M2.5");
    expect(fallback.every((model) => model.type === "text")).toBe(true);
  });

  test("live pricing page still parses expected sentinel rows", async () => {
    const html = await fetchHtml("https://platform.minimax.io/docs/guides/pricing-paygo", {
      validateHtml: (candidate) => parseMinimaxHtml(candidate).length > 0
    });
    const models = parseMinimaxHtml(html);

    expect(models.length).toBeGreaterThanOrEqual(6);
    expect(models.map((model) => model.model)).toContain("MiniMax-M2.5");
    expect(
      models.find((model) => model.model === "MiniMax-M2.5")
    ).toMatchObject({
      input_price_per_million: 0.3,
      output_price_per_million: 1.2
    });
  }, 30000);
});
