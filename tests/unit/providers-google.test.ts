import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getGoogleManualFallback, parseGoogleHtml } from "../../src/providers/google.js";
import { fetchHtml } from "../../src/providers/utils.js";

describe("providers/google", () => {
  test("parseGoogleHtml parses target Gemini text model sections", async () => {
    const fixturePath = resolve(__dirname, "../fixtures/google-pricing.html");
    const html = await readFile(fixturePath, "utf8");

    const models = parseGoogleHtml(html);

    expect(models).toEqual([
      expect.objectContaining({
        model: "gemini-2.5-pro",
        input_price_per_million: 1.25,
        output_price_per_million: 10
      }),
      expect.objectContaining({
        model: "gemini-2.5-flash",
        input_price_per_million: 0.3,
        output_price_per_million: 2.5
      }),
      expect.objectContaining({
        model: "gemini-2.5-flash-lite",
        input_price_per_million: 0.1,
        output_price_per_million: 0.4
      })
    ]);
  });

  test("getGoogleManualFallback returns current official text models", () => {
    const fallback = getGoogleManualFallback();
    expect(fallback.map((model) => model.model)).toEqual([
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite"
    ]);
  });

  test("live pricing page still parses target Gemini sections", async () => {
    const html = await fetchHtml("https://ai.google.dev/gemini-api/docs/pricing", {
      validateHtml: (candidate) => parseGoogleHtml(candidate).length > 0
    });
    const models = parseGoogleHtml(html);

    expect(models.map((model) => model.model)).toEqual([
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite"
    ]);
    expect(
      models.find((model) => model.model === "gemini-2.5-pro")
    ).toMatchObject({
      input_price_per_million: 1.25,
      output_price_per_million: 10
    });
  }, 30000);
});
