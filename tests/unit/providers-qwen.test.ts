import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getQwenManualFallback, parseQwenHtml } from "../../src/providers/qwen.js";
import { fetchHtml } from "../../src/providers/utils.js";

describe("providers/qwen", () => {
  test("parseQwenHtml parses target Alibaba pricing rows", async () => {
    const fixturePath = resolve(__dirname, "../fixtures/qwen-pricing.html");
    const html = await readFile(fixturePath, "utf8");

    const models = parseQwenHtml(html);

    expect(models).toHaveLength(7);
    expect(models.find((model) => model.model === "qwen-max")).toMatchObject({
      input_price_per_million: 1.6,
      output_price_per_million: 6.4
    });
    expect(models.find((model) => model.model === "qwen-turbo")).toMatchObject({
      input_price_per_million: 0.05,
      output_price_per_million: 0.2
    });
    expect(models.map((model) => model.model)).not.toContain("32k");
  });

  test("getQwenManualFallback returns current official text models", () => {
    const fallback = getQwenManualFallback();
    expect(fallback.map((model) => model.model)).toContain("qwen-max");
    expect(fallback.every((model) => model.type === "text")).toBe(true);
  });

  test("live pricing page still parses expected sentinel rows", async () => {
    const html = await fetchHtml("https://www.alibabacloud.com/help/en/model-studio/model-pricing", {
      validateHtml: (candidate) => parseQwenHtml(candidate).length > 0
    });
    const models = parseQwenHtml(html);

    expect(models.length).toBeGreaterThan(40);
    expect(models.map((model) => model.model)).toContain("qwen-max");
    expect(models.map((model) => model.model)).not.toContain("32k");
    expect(
      models.find((model) => model.model === "qwen-max")
    ).toMatchObject({
      input_price_per_million: 1.6,
      output_price_per_million: 6.4
    });
  }, 30000);
});
