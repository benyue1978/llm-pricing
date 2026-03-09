import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseOpenAIHtml, getOpenAIManualFallback } from "../../src/providers/openai.js";
import { fetchHtml } from "../../src/providers/utils.js";

describe("providers/openai", () => {
  test("parseOpenAIHtml parses the real content-switcher table shape", async () => {
    const fixturePath = resolve(__dirname, "../fixtures/openai-pricing.html");
    const html = await readFile(fixturePath, "utf8");

    const models = parseOpenAIHtml(html);

    expect(models).toHaveLength(4);
    expect(models.every((model) => model.type === "text")).toBe(true);

    const gpt4o = models.find((m) => m.model === "gpt-4o");
    expect(gpt4o).toMatchObject({
      provider: "openai",
      type: "text",
      input_price_per_million: 2.5,
      output_price_per_million: 10,
      currency: "USD"
    });

    const gpt41 = models.find((m) => m.model === "gpt-4.1");
    expect(gpt41).toMatchObject({
      input_price_per_million: 2,
      output_price_per_million: 8
    });

    expect(models.some((m) => m.model === "gpt-audio")).toBe(false);
    expect(models.some((m) => m.model === "gpt-image-1.5")).toBe(false);
  });

  test("getOpenAIManualFallback returns at least one model", () => {
    const fallback = getOpenAIManualFallback();
    expect(fallback.length).toBeGreaterThan(0);
    for (const model of fallback) {
      expect(model.provider).toBe("openai");
      expect(model.type).toBe("text");
      expect(model.currency).toBe("USD");
    }
  });

  test("live pricing page still parses expected sentinel models", async () => {
    const html = await fetchHtml("https://developers.openai.com/api/docs/pricing", {
      validateHtml: (candidate) => parseOpenAIHtml(candidate).length > 0
    });
    const models = parseOpenAIHtml(html);

    expect(models.length).toBeGreaterThan(10);
    expect(models.map((model) => model.model)).toContain("gpt-4.1");
    expect(models.map((model) => model.model)).toContain("gpt-4o");
    expect(
      models.find((model) => model.model === "gpt-4.1")
    ).toMatchObject({
      input_price_per_million: 2,
      output_price_per_million: 8
    });
  }, 30000);
});
