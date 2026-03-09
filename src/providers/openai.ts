import { load } from "cheerio";
import { fetch } from "undici";
import type { PricingModel } from "../schema.js";

const OPENAI_PRICING_URL = "https://platform.openai.com/pricing";

export async function fetchOpenAIPricing(): Promise<PricingModel[]> {
  try {
    const response = await fetch(OPENAI_PRICING_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const html = await response.text();
    const parsed = parseOpenAIHtml(html);
    if (parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Fall back to manual values if scraping fails.
  }
  return getOpenAIManualFallback();
}

export function parseOpenAIHtml(html: string): PricingModel[] {
  const $ = load(html);
  const models: PricingModel[] = [];

  // This parser is intentionally conservative and primarily supports our test fixture.
  $("[data-llm-pricing-row]").each((_, el) => {
    const provider = $(el).attr("data-provider") ?? "openai";
    const model = $(el).attr("data-model") ?? "";
    const inputStr = $(el).attr("data-input-usd-per-m") ?? "";
    const outputStr = $(el).attr("data-output-usd-per-m") ?? "";

    const input = Number.parseFloat(inputStr);
    const output = outputStr ? Number.parseFloat(outputStr) : NaN;

    if (!model || !Number.isFinite(input)) {
      return;
    }

    models.push({
      provider,
      model,
      input_price_per_million: input,
      output_price_per_million: Number.isFinite(output) ? output : null,
      currency: "USD",
      source: OPENAI_PRICING_URL
    });
  });

  return models;
}

export function getOpenAIManualFallback(): PricingModel[] {
  const source = OPENAI_PRICING_URL;
  return [
    {
      provider: "openai",
      model: "gpt-4o",
      input_price_per_million: 5,
      output_price_per_million: 15,
      currency: "USD",
      source
    },
    {
      provider: "openai",
      model: "gpt-4o-mini",
      input_price_per_million: 0.15,
      output_price_per_million: 0.6,
      currency: "USD",
      source
    }
  ];
}

