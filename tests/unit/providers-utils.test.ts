import { describe, expect, test, vi } from "vitest";
import { load } from "cheerio";
import {
  extractAssignedArray,
  extractBracketedValue,
  fetchProviderPricing,
  findNextTable,
  findScriptSrc,
  findTableByHeaders,
  getJsNumberProperty,
  getJsStringArrayFirst,
  getJsStringProperty,
  getCellTexts,
  normalizeText,
  extractUsdAmounts,
  parseCnyAmount,
  parseUsdAmount,
  createTextPricingModel,
  splitTopLevelObjects,
  extractConditionalAssignedArray
} from "../../src/providers/utils.js";
import {
  ensureValidatedJson,
  ensureValidatedText
} from "../../src/providers/lib/fetch.js";

describe("providers/utils", () => {
  test("normalizeText collapses whitespace and trims empty input", () => {
    expect(normalizeText("  hello \n world  ")).toBe("hello world");
    expect(normalizeText(undefined)).toBe("");
  });

  test("getCellTexts returns normalized cell text", () => {
    const $ = load("<table><tr><td> Alpha </td><td>Beta\\nGamma</td></tr></table>");
    const row = $("tr").get(0);

    expect(getCellTexts($, row)).toEqual(["Alpha", "Beta\\nGamma"]);
  });

  test("findTableByHeaders finds a table by required header fragments", () => {
    const $ = load(`
      <table><thead><tr><th>Name</th><th>Price</th></tr></thead></table>
      <table><thead><tr><th>Model</th><th>Base Input Tokens</th><th>Output Tokens</th></tr></thead></table>
    `);

    const table = findTableByHeaders($, ["Base Input Tokens", "Output Tokens"]);
    expect(table.length).toBe(1);
    expect(table.find("th").eq(0).text()).toBe("Model");
  });

  test("findNextTable returns the next nested table and honors stop conditions", () => {
    const $ = load(`
      <section class="models-section"><h2 id="target">Target</h2></section>
      <div><table id="match"></table></div>
      <section class="models-section"><h2 id="stop">Stop</h2></section>
      <div><table id="later"></table></div>
    `);

    const table = findNextTable($, $(".models-section").first(), {
      stopAt: (current) => current.hasClass("models-section")
    });
    expect(table.attr("id")).toBe("match");

    const stopped = findNextTable($, $(".models-section").eq(1), {
      stopAt: (current) => current.hasClass("missing")
    });
    expect(stopped.attr("id")).toBe("later");
  });

  test("parseUsdAmount, parseCnyAmount, and extractUsdAmounts parse prices consistently", () => {
    expect(parseUsdAmount("$1.25 per 1M tokens")).toBe(1.25);
    expect(parseCnyAmount("¥18 / M Tokens")).toBe(18);
    expect(extractUsdAmounts("$0.30 text, $1.00 audio, $2.50 output")).toEqual([0.3, 1, 2.5]);
  });

  test("findScriptSrc resolves relative and protocol-relative script URLs", () => {
    const html = `
      <script src="//cdn.example.com/shared.js"></script>
      <script src="/js/app.123.js"></script>
    `;

    expect(findScriptSrc(html, (src) => src.includes("shared"), "https://example.com/page")).toBe(
      "https://cdn.example.com/shared.js"
    );
    expect(findScriptSrc(html, (src) => /\/js\/app\./.test(src), "https://example.com/page")).toBe(
      "https://example.com/js/app.123.js"
    );
  });

  test("extractBracketedValue preserves nested arrays and quoted brackets", () => {
    const source = 'prefix modelList:[{name:"GLM-5",upDownText:["Input length [0, 32)"],inPrice:["¥4"]}] suffix';
    const openIndex = source.indexOf("[");

    expect(extractBracketedValue(source, openIndex, "[", "]")).toBe(
      '[{name:"GLM-5",upDownText:["Input length [0, 32)"],inPrice:["¥4"]}]'
    );
  });

  test("extractAssignedArray and extractConditionalAssignedArray read JS array literals", () => {
    const source = 'let ev=[{model_id:"moonshot-v1-8k",prompt:.2}];let ez=ei.lJ?[{model_id:"kimi-k2.5",prompt:.6}]:[{model_id:"kimi-k2.5",prompt:4}]';

    expect(extractAssignedArray(source, "ev=")).toBe('[{model_id:"moonshot-v1-8k",prompt:.2}]');
    expect(extractConditionalAssignedArray(source, "ez=ei.lJ?", "truthy")).toBe(
      '[{model_id:"kimi-k2.5",prompt:.6}]'
    );
    expect(extractConditionalAssignedArray(source, "ez=ei.lJ?", "falsy")).toBe(
      '[{model_id:"kimi-k2.5",prompt:4}]'
    );
  });

  test("splitTopLevelObjects and JS property readers parse minified object literals", () => {
    const objects = splitTopLevelObjects(
      '[{name:"GLM-5",inPrice:["¥4"],outPrice:["¥18"],prompt:.6},{name:"",inPrice:["¥6"],outPrice:["¥22"]}]'
    );

    expect(objects).toHaveLength(2);
    expect(getJsStringProperty(objects[0], "name")).toBe("GLM-5");
    expect(getJsStringArrayFirst(objects[0], "inPrice")).toBe("¥4");
    expect(getJsStringArrayFirst(objects[0], "outPrice")).toBe("¥18");
    expect(getJsNumberProperty('{model_id:"kimi-k2.5",prompt:.6,completion:3}', "prompt")).toBe(0.6);
  });

  test("createTextPricingModel builds a standard text pricing entry", () => {
    expect(createTextPricingModel({
      provider: "demo",
      model: "demo-model",
      input: 1,
      output: 2,
      currency: "USD",
      source: "https://example.com"
    })).toEqual({
      provider: "demo",
      model: "demo-model",
      type: "text",
      input_price_per_million: 1,
      output_price_per_million: 2,
      currency: "USD",
      source: "https://example.com"
    });
  });

  test("fetchProviderPricing returns live models when available", async () => {
    const logger = vi.fn();
    const liveModels = [createTextPricingModel({
      provider: "demo",
      model: "live",
      input: 1,
      output: 2,
      currency: "USD",
      source: "https://example.com/live"
    })];

    const models = await fetchProviderPricing({
      logger,
      fetchLive: vi.fn().mockResolvedValue(liveModels),
      getFallback: vi.fn().mockReturnValue([]),
      describeLive: (entries) => `live ${entries.length}`
    });

    expect(models).toEqual(liveModels);
    expect(logger).toHaveBeenCalledWith("live 1");
  });

  test("fetchProviderPricing falls back when live fetch fails", async () => {
    const logger = vi.fn();
    const fallbackModels = [createTextPricingModel({
      provider: "demo",
      model: "fallback",
      input: 3,
      output: 4,
      currency: "USD",
      source: "https://example.com/fallback"
    })];

    const models = await fetchProviderPricing({
      logger,
      fetchLive: vi.fn().mockRejectedValue(new Error("boom")),
      getFallback: vi.fn().mockReturnValue(fallbackModels),
      describeFallback: (entries) => `fallback ${entries.length}`
    });

    expect(models).toEqual(fallbackModels);
    expect(logger).toHaveBeenCalledWith("fallback 1");
  });

  test("ensureValidatedText rejects invalid provider HTML instead of leaking it downstream", () => {
    expect(() =>
      ensureValidatedText("<html>challenge page</html>", (text) => text.includes("pricing table"))
    ).toThrowError("Fetched text did not pass validation");
  });

  test("ensureValidatedJson rejects invalid JSON payloads instead of silently returning them", () => {
    expect(() =>
      ensureValidatedJson({ status: "stale" }, (payload) => payload.status === "ok")
    ).toThrowError("Fetched JSON did not pass validation");
  });
});
