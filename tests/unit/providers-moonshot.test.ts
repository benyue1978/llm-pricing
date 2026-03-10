import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fetchHtml, fetchText } from "../../src/providers/utils.js";
import {
  findMoonshotAppScriptUrl,
  getMoonshotManualFallback,
  parseMoonshotAppScript
} from "../../src/providers/moonshot.js";

describe("providers/moonshot", () => {
  test("parseMoonshotAppScript parses the official app bundle pricing arrays", async () => {
    const fixturePath = resolve(__dirname, "../fixtures/moonshot-app.js");
    const script = await readFile(fixturePath, "utf8");

    const models = parseMoonshotAppScript(script);

    expect(models).toHaveLength(7);
    expect(models.find((model) => model.model === "kimi-k2.5")).toMatchObject({
      input_price_per_million: 0.6,
      output_price_per_million: 3
    });
    expect(models.find((model) => model.model === "moonshot-v1-128k")).toMatchObject({
      input_price_per_million: 2,
      output_price_per_million: 5
    });
    expect(models.map((model) => model.model)).not.toContain("moonshot-v1-8k-vision-preview");
  });

  test("getMoonshotManualFallback returns current official text models", () => {
    const fallback = getMoonshotManualFallback();
    expect(fallback.map((model) => model.model)).toContain("kimi-k2.5");
    expect(fallback.every((model) => model.type === "text")).toBe(true);
  });

  test("live official page-backed app bundle still parses expected sentinel rows", async () => {
    const html = await fetchHtml("https://platform.moonshot.ai/docs/pricing/chat", {
      validateHtml: (candidate) => Boolean(findMoonshotAppScriptUrl(candidate))
    });
    const appScriptUrl = findMoonshotAppScriptUrl(html);

    expect(appScriptUrl).toBeTruthy();

    const script = await fetchText(appScriptUrl as string, {
      accept: "application/javascript,text/javascript,*/*",
      validateText: (candidate) => parseMoonshotAppScript(candidate).length > 0
    });
    const models = parseMoonshotAppScript(script);

    expect(models.length).toBeGreaterThanOrEqual(9);
    expect(models.map((model) => model.model)).toContain("kimi-k2.5");
    expect(
      models.find((model) => model.model === "kimi-k2.5")
    ).toMatchObject({
      input_price_per_million: 0.6,
      output_price_per_million: 3
    });
  }, 30000);
});
