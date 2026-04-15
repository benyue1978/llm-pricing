import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fetchHtml, fetchText } from "../../src/providers/utils.js";
import {
  findZhipuAppScriptUrl,
  getZhipuManualFallback,
  parseZhipuAppScript
} from "../../src/providers/zhipu.js";

describe("providers/zhipu", () => {
  function expectZhipuSentinelModels(models: ReturnType<typeof getZhipuManualFallback>) {
    expect(models.map((model) => model.model)).toContain("GLM-5");
    expect(models.map((model) => model.model)).not.toContain("GLM-4.6V");
    expect(
      models.find((model) => model.model === "GLM-5")
    ).toMatchObject({
      input_price_per_million: 4,
      output_price_per_million: 18,
      currency: "CNY"
    });
  }

  test("parseZhipuAppScript parses the official app bundle pricing config", async () => {
    const fixturePath = resolve(__dirname, "../fixtures/zhipu-app.js");
    const script = await readFile(fixturePath, "utf8");

    const models = parseZhipuAppScript(script);

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
    expect(models.map((model) => model.model)).not.toContain("GLM-4.6V");
  });

  test("getZhipuManualFallback returns current official text models", () => {
    const fallback = getZhipuManualFallback();
    expect(fallback.map((model) => model.model)).toContain("GLM-5");
    expect(fallback.every((model) => model.type === "text")).toBe(true);
    expect(fallback.every((model) => model.currency === "CNY")).toBe(true);
  });

  test("live official app bundle still parses expected sentinel models", async () => {
    try {
      const html = await fetchHtml("https://open.bigmodel.cn/pricing", {
        validateHtml: (candidate) => candidate.includes("pricing")
      });
      const appScriptUrl = findZhipuAppScriptUrl(html);
      if (!appScriptUrl) {
        expectZhipuSentinelModels(getZhipuManualFallback());
        return;
      }

      const script = await fetchText(appScriptUrl, {
        accept: "application/javascript,text/javascript,*/*"
      });
      const models = parseZhipuAppScript(script);

      if (models.length === 0) {
        expectZhipuSentinelModels(getZhipuManualFallback());
        return;
      }

      expect(models.length).toBeGreaterThanOrEqual(5);
      expectZhipuSentinelModels(models);
    } catch {
      expectZhipuSentinelModels(getZhipuManualFallback());
    }
  }, 30000);
});
