import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseOpenAIHtml, getOpenAIManualFallback } from "../../src/providers/openai.js";
import { fetchHtml } from "../../src/providers/utils.js";

describe("providers/openai", () => {
  test("parseOpenAIHtml parses the real content-switcher table shape", async () => {
    const fixturePath = resolve(__dirname, "../fixtures/openai-pricing.html");
    const html = await readFile(fixturePath, "utf8");

    const models = parseOpenAIHtml(html);

    expect(models).toHaveLength(4);
    expect(models.every((model) => model.type === "text")).toBe(true);

    const gpt4o = models.find((m) => m.model === "gpt-4o");
    expect(gpt4o).toMatchObject({
      provider: "openai",
      type: "text",
      input_price_per_million: 2.5,
      output_price_per_million: 10,
      currency: "USD"
    });

    const gpt41 = models.find((m) => m.model === "gpt-4.1");
    expect(gpt41).toMatchObject({
      input_price_per_million: 2,
      output_price_per_million: 8
    });

    expect(models.some((m) => m.model === "gpt-audio")).toBe(false);
    expect(models.some((m) => m.model === "gpt-image-1.5")).toBe(false);
  });

  test("parseOpenAIHtml parses Astro island pricing rows when SSR tables are truncated", () => {
    const html = `
      <div data-content-switcher-root data-content-switcher-id="latest-pricing">
        <div data-content-switcher-pane="true" data-value="standard">
          <astro-island
            component-export="TextTokenPricingTables"
            props='{"tier":[0,"standard"],"rows":[1,[[1,[[0,"gpt-5.4 (<272K context length)"],[0,2.5],[0,0.25],[0,15]]],[1,[[0,"gpt-4.1"],[0,2],[0,0.5],[0,8]]],[1,[[0,"gpt-image-1.5"],[0,2.5],[0,0.63],[0,5]]]]]}'
          ></astro-island>
          <table>
            <tbody>
              <tr><td>gpt-5.4</td><td>$2.50</td><td>$0.25</td><td>$15.00</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    const models = parseOpenAIHtml(html);

    expect(models).toEqual(expect.arrayContaining([
      expect.objectContaining({
        model: "gpt-5.4",
        input_price_per_million: 2.5,
        output_price_per_million: 15
      }),
      expect.objectContaining({
        model: "gpt-4.1",
        input_price_per_million: 2,
        output_price_per_million: 8
      })
    ]));
    expect(models.some((model) => model.model === "gpt-image-1.5")).toBe(false);
  });

  test("getOpenAIManualFallback returns at least one model", () => {
    const fallback = getOpenAIManualFallback();
    expect(fallback.length).toBeGreaterThan(0);
    for (const model of fallback) {
      expect(model.provider).toBe("openai");
      expect(model.type).toBe("text");
      expect(model.currency).toBe("USD");
    }
  });

  test("live pricing page still parses official text pricing rows", async () => {
    const html = await fetchHtml("https://developers.openai.com/api/docs/pricing", {
      validateHtml: (candidate) => parseOpenAIHtml(candidate).length > 0
    });
    const models = parseOpenAIHtml(html);

    expect(models.length).toBeGreaterThan(0);
    expect(models.every((model) => model.provider === "openai")).toBe(true);
    expect(models.every((model) => model.type === "text")).toBe(true);
    expect(models.every((model) => model.currency === "USD")).toBe(true);
    expect(models.every((model) => model.model.length > 0)).toBe(true);
    expect(
      models.every((model) => Number.isFinite(model.input_price_per_million) && model.input_price_per_million >= 0)
    ).toBe(true);
    expect(
      models.every((model) =>
        model.output_price_per_million === null ||
        (Number.isFinite(model.output_price_per_million) && model.output_price_per_million >= 0)
      )
    ).toBe(true);
  }, 30000);
});
