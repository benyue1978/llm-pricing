import { load } from "cheerio";
import type { PricingModel } from "../schema.js";
import {
  createTextPricingModel,
  fetchHtml,
  fetchProviderPricing,
  findTableByHeaders,
  normalizeText,
  parseUsdAmount
} from "./utils.js";
import type { ProviderLogger } from "./types.js";

const MINIMAX_PRICING_SOURCE = "https://platform.minimax.io/docs/guides/pricing-paygo";

export async function fetchMinimaxPricing(logger: ProviderLogger = () => {}): Promise<PricingModel[]> {
  return fetchProviderPricing({
    logger,
    fetchLive: async () => {
      const html = await fetchHtml(MINIMAX_PRICING_SOURCE, {
        validateHtml: (candidate) => parseMinimaxHtml(candidate).length > 0
      });
      return parseMinimaxHtml(html);
    },
    getFallback: getMinimaxManualFallback
  });
}

export function parseMinimaxHtml(html: string): PricingModel[] {
  const $ = load(html);
  const models: PricingModel[] = [];
  const seen = new Set<string>();
  const table = findTableByHeaders($, ["model", "prompt caching read", "prompt caching write"]);

  table.find("tbody tr").each((_, row) => {
    const cells = $(row).find("td");
    const model = normalizeText(cells.eq(0).text());
    if (!model || seen.has(model)) {
      return;
    }

    const input = parseUsdAmount(cells.eq(1).text());
    const output = parseUsdAmount(cells.eq(2).text());
    if (!Number.isFinite(input) || !Number.isFinite(output)) {
      return;
    }

    seen.add(model);
    models.push(createTextPricingModel({
      provider: "minimax",
      model,
      input,
      output,
      currency: "USD",
      source: MINIMAX_PRICING_SOURCE
    }));
  });

  return models;
}

export function getMinimaxManualFallback(): PricingModel[] {
  return [
    {
      provider: "minimax",
      model: "MiniMax-M2.7",
      type: "text",
      input_price_per_million: 0.3,
      output_price_per_million: 1.2,
      currency: "USD",
      source: MINIMAX_PRICING_SOURCE
    },
    {
      provider: "minimax",
      model: "MiniMax-M2.7-highspeed",
      type: "text",
      input_price_per_million: 0.6,
      output_price_per_million: 2.4,
      currency: "USD",
      source: MINIMAX_PRICING_SOURCE
    },
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
      model: "M2-her",
      type: "text",
      input_price_per_million: 0.3,
      output_price_per_million: 1.2,
      currency: "USD",
      source: MINIMAX_PRICING_SOURCE
    }
  ];
}
