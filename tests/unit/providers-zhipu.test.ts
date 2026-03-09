import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getZhipuManualFallback, parseZhipuPayload } from "../../src/providers/zhipu.js";
import { fetchHtml, fetchJson } from "../../src/providers/utils.js";

describe("providers/zhipu", () => {
  test("parseZhipuPayload parses the official pricing payload", async () => {
    const fixturePath = resolve(__dirname, "../fixtures/zhipu-pricing.json");
    const raw = await readFile(fixturePath, "utf8");

    const models = parseZhipuPayload(JSON.parse(raw));

    expect(models).toHaveLength(6);
    expect(models.find((model) => model.model === "GLM-4-Plus")).toMatchObject({
      input_price_per_million: 5,
      output_price_per_million: null,
      currency: "CNY"
    });
    expect(models.find((model) => model.model === "GLM-4-FlashX-250414")).toMatchObject({
      input_price_per_million: 0.1,
      output_price_per_million: null
    });
  });

  test("getZhipuManualFallback returns current official text models", () => {
    const fallback = getZhipuManualFallback();
    expect(fallback.map((model) => model.model)).toContain("GLM-4-Plus");
    expect(fallback.every((model) => model.type === "text")).toBe(true);
    expect(fallback.every((model) => model.currency === "CNY")).toBe(true);
  });

  test("live pricing page and payload still parse expected sentinel models", async () => {
    const html = await fetchHtml("https://open.bigmodel.cn/pricing");
    expect(html).toContain('<div id="app">');

    const payload = await fetchJson("https://open.bigmodel.cn/api/biz/operation/query?ids=1122", {
      validateJson: (candidate) => parseZhipuPayload(candidate as never).length > 0
    });
    const models = parseZhipuPayload(payload);

    expect(models.length).toBeGreaterThanOrEqual(6);
    expect(models.map((model) => model.model)).toContain("GLM-4-Plus");
    expect(
      models.find((model) => model.model === "GLM-4-Plus")
    ).toMatchObject({
      input_price_per_million: 5,
      output_price_per_million: null,
      currency: "CNY"
    });
  }, 30000);
});
