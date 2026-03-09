import { load } from "cheerio";
import type { PricingModel } from "../schema.js";
import { fetchHtml, parseUsdAmount } from "./utils.js";

const MINIMAX_PRICING_SOURCE = "https://platform.minimax.io/docs/guides/pricing-paygo";
const MINIMAX_TEXT_MODELS = [
  "MiniMax-M2.5",
  "MiniMax-M2.5-highspeed",
  "MiniMax-M2.1",
  "MiniMax-M2.1-highspeed",
  "MiniMax-M2",
  "M2-her"
] as const;

export async function fetchMinimaxPricing(): Promise<PricingModel[]> {
  try {
    const html = await fetchHtml(MINIMAX_PRICING_SOURCE, {
      validateHtml: (candidate) => parseMinimaxHtml(candidate).length > 0
    });
    const parsed = parseMinimaxHtml(html);
    if (parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Fall back to current official values if scraping fails.
  }

  return getMinimaxManualFallback();
}

export function parseMinimaxHtml(html: string): PricingModel[] {
  const $ = load(html);
  const models: PricingModel[] = [];
  const seen = new Set<string>();

  $("tbody tr").each((_, row) => {
    const cells = $(row).find("td");
    const model = normalizeText(cells.eq(0).text());
    if (!MINIMAX_TEXT_MODELS.includes(model as (typeof MINIMAX_TEXT_MODELS)[number]) || seen.has(model)) {
      return;
    }

    const input = parseUsdAmount(cells.eq(1).text());
    const output = parseUsdAmount(cells.eq(2).text());
    if (!Number.isFinite(input) || !Number.isFinite(output)) {
      return;
    }

    seen.add(model);
    models.push({
      provider: "minimax",
      model,
      type: "text",
      input_price_per_million: input,
      output_price_per_million: output,
      currency: "USD",
      source: MINIMAX_PRICING_SOURCE
    });
  });

  return models;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function getMinimaxManualFallback(): PricingModel[] {
  return [
    {
      provider: "minimax",
      model: "MiniMax-M2.5",
      type: "text",
      input_price_per_million: 0.3,
      output_price_per_million: 1.2,
      currency: "USD",
      source: MINIMAX_PRICING_SOURCE
    },
    {
      provider: "minimax",
      model: "MiniMax-M2.5-highspeed",
      type: "text",
      input_price_per_million: 0.6,
      output_price_per_million: 2.4,
      currency: "USD",
      source: MINIMAX_PRICING_SOURCE
    },
    {
      provider: "minimax",
      model: "MiniMax-M2.1",
      type: "text",
      input_price_per_million: 0.3,
      output_price_per_million: 1.2,
      currency: "USD",
      source: MINIMAX_PRICING_SOURCE
    },
    {
      provider: "minimax",
      model: "MiniMax-M2.1-highspeed",
      type: "text",
      input_price_per_million: 0.6,
      output_price_per_million: 2.4,
      currency: "USD",
      source: MINIMAX_PRICING_SOURCE
    },
    {
      provider: "minimax",
      model: "MiniMax-M2",
      type: "text",
      input_price_per_million: 0.3,
      output_price_per_million: 1.2,
      currency: "USD",
      source: MINIMAX_PRICING_SOURCE
    },
    {
      provider: "minimax",
      model: "M2-her",
      type: "text",
      input_price_per_million: 0.3,
      output_price_per_million: 1.2,
      currency: "USD",
      source: MINIMAX_PRICING_SOURCE
    }
  ];
}
