import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseOpenAIHtml, getOpenAIManualFallback } from "../../src/providers/openai.js";

describe("providers/openai", () => {
  test("parseOpenAIHtml parses synthetic table into pricing models", async () => {
    const fixturePath = resolve(__dirname, "../fixtures/openai-pricing.html");
    const html = await readFile(fixturePath, "utf8");

    const models = parseOpenAIHtml(html);

    expect(models).toHaveLength(2);
    const gpt4o = models.find((m) => m.model === "gpt-4o");
    expect(gpt4o).toMatchObject({
      provider: "openai",
      input_price_per_million: 5,
      output_price_per_million: 15,
      currency: "USD"
    });
  });

  test("getOpenAIManualFallback returns at least one model", () => {
    const fallback = getOpenAIManualFallback();
    expect(fallback.length).toBeGreaterThan(0);
    for (const model of fallback) {
      expect(model.provider).toBe("openai");
      expect(model.currency).toBe("USD");
    }
  });
});

