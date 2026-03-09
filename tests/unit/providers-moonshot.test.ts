import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fetchRenderedHtml } from "../../src/providers/utils.js";
import { getMoonshotManualFallback, parseMoonshotHtml } from "../../src/providers/moonshot.js";

describe("providers/moonshot", () => {
  test("parseMoonshotHtml parses the official pricing tables", async () => {
    const fixturePath = resolve(__dirname, "../fixtures/moonshot-pricing.html");
    const html = await readFile(fixturePath, "utf8");

    const models = parseMoonshotHtml(html);

    expect(models).toHaveLength(6);
    expect(models.find((model) => model.model === "kimi-k2.5")).toMatchObject({
      input_price_per_million: 0.1,
      output_price_per_million: 3
    });
    expect(models.find((model) => model.model === "moonshot-v1-128k")).toMatchObject({
      input_price_per_million: 2,
      output_price_per_million: 5
    });
  });

  test("getMoonshotManualFallback returns current official text models", () => {
    const fallback = getMoonshotManualFallback();
    expect(fallback.map((model) => model.model)).toContain("kimi-k2.5");
    expect(fallback.every((model) => model.type === "text")).toBe(true);
  });

  test("live pricing page still parses expected sentinel rows", async () => {
    const html = await fetchRenderedHtml("https://platform.moonshot.ai/docs/pricing/chat", {
      validateHtml: (candidate) => parseMoonshotHtml(candidate).length > 0
    });
    const models = parseMoonshotHtml(html);

    expect(models.length).toBeGreaterThanOrEqual(6);
    expect(models.map((model) => model.model)).toContain("kimi-k2.5");
    expect(
      models.find((model) => model.model === "kimi-k2.5")
    ).toMatchObject({
      input_price_per_million: 0.1,
      output_price_per_million: 3
    });
  }, 90000);
});
