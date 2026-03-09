import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getMistralManualFallback, parseMistralHtml } from "../../src/providers/mistral.js";
import { fetchHtml } from "../../src/providers/utils.js";

describe("providers/mistral", () => {
  test("parseMistralHtml parses the embedded official pricing payload", async () => {
    const fixturePath = resolve(__dirname, "../fixtures/mistral-pricing.html");
    const html = await readFile(fixturePath, "utf8");

    const models = parseMistralHtml(html);

    expect(models).toHaveLength(6);
    expect(models.find((model) => model.model === "mistral-large-latest")).toMatchObject({
      input_price_per_million: 0.5,
      output_price_per_million: 1.5
    });
    expect(models.find((model) => model.model === "codestral-latest")).toMatchObject({
      input_price_per_million: 0.3,
      output_price_per_million: 0.9
    });
  });

  test("getMistralManualFallback returns current official text models", () => {
    const fallback = getMistralManualFallback();
    expect(fallback.map((model) => model.model)).toContain("mistral-large-latest");
    expect(fallback.every((model) => model.type === "text")).toBe(true);
  });

  test("live pricing page still parses expected sentinel payloads", async () => {
    const html = await fetchHtml("https://mistral.ai/pricing", {
      validateHtml: (candidate) => parseMistralHtml(candidate).length > 0
    });
    const models = parseMistralHtml(html);

    expect(models.length).toBeGreaterThanOrEqual(6);
    expect(models.map((model) => model.model)).toContain("mistral-large-latest");
    expect(
      models.find((model) => model.model === "mistral-large-latest")
    ).toMatchObject({
      input_price_per_million: 0.5,
      output_price_per_million: 1.5
    });
  }, 30000);
});
