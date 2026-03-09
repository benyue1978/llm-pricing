import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getZhipuManualFallback, parseZhipuHtml } from "../../src/providers/zhipu.js";
import { fetchRenderedHtml } from "../../src/providers/utils.js";

describe("providers/zhipu", () => {
  test("parseZhipuHtml parses the official rendered pricing tables", async () => {
    const fixturePath = resolve(__dirname, "../fixtures/zhipu-pricing.html");
    const html = await readFile(fixturePath, "utf8");

    const models = parseZhipuHtml(html);

    expect(models).toHaveLength(5);
    expect(models.find((model) => model.model === "GLM-5")).toMatchObject({
      input_price_per_million: 4,
      output_price_per_million: 18,
      currency: "CNY"
    });
    expect(models.find((model) => model.model === "GLM-4.5-Air")).toMatchObject({
      input_price_per_million: 0.8,
      output_price_per_million: 2
    });
  });

  test("getZhipuManualFallback returns current official text models", () => {
    const fallback = getZhipuManualFallback();
    expect(fallback.map((model) => model.model)).toContain("GLM-5");
    expect(fallback.every((model) => model.type === "text")).toBe(true);
    expect(fallback.every((model) => model.currency === "CNY")).toBe(true);
  });

  test("live rendered pricing page still parses expected sentinel models", async () => {
    const html = await fetchRenderedHtml("https://open.bigmodel.cn/pricing", {
      validateHtml: (candidate) => parseZhipuHtml(candidate).length > 0
    });
    const models = parseZhipuHtml(html);

    expect(models.length).toBeGreaterThanOrEqual(5);
    expect(models.map((model) => model.model)).toContain("GLM-5");
    expect(models.map((model) => model.model)).not.toContain("GLM-4.6V");
    expect(
      models.find((model) => model.model === "GLM-5")
    ).toMatchObject({
      input_price_per_million: 4,
      output_price_per_million: 18,
      currency: "CNY"
    });
  }, 90000);
});
