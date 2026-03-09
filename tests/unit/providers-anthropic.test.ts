import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getAnthropicManualFallback, parseAnthropicHtml } from "../../src/providers/anthropic.js";
import { fetchHtml } from "../../src/providers/utils.js";

describe("providers/anthropic", () => {
  test("parseAnthropicHtml parses the official pricing table shape", async () => {
    const fixturePath = resolve(__dirname, "../fixtures/anthropic-pricing.html");
    const html = await readFile(fixturePath, "utf8");

    const models = parseAnthropicHtml(html);

    expect(models).toHaveLength(3);
    expect(models.map((model) => model.model)).toEqual([
      "claude-opus-4.6",
      "claude-sonnet-4.6",
      "claude-haiku-4.5"
    ]);
    expect(models.every((model) => model.type === "text")).toBe(true);
  });

  test("getAnthropicManualFallback returns current official text models", () => {
    const fallback = getAnthropicManualFallback();
    expect(fallback.map((model) => model.model)).toContain("claude-opus-4.6");
    expect(fallback.every((model) => model.type === "text")).toBe(true);
  });

  test("live pricing page still parses expected sentinel models", async () => {
    const html = await fetchHtml("https://platform.claude.com/docs/en/about-claude/pricing", {
      validateHtml: (candidate) => parseAnthropicHtml(candidate).length > 0
    });
    const models = parseAnthropicHtml(html);

    expect(models.length).toBeGreaterThanOrEqual(3);
    expect(models.map((model) => model.model)).toContain("claude-sonnet-4.6");
    expect(
      models.find((model) => model.model === "claude-sonnet-4.6")
    ).toMatchObject({
      input_price_per_million: 3,
      output_price_per_million: 15
    });
  }, 30000);
});
