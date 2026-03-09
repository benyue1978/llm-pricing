import { load } from "cheerio";
import type { PricingModel } from "../schema.js";
import { fetchHtml, parseUsdAmount } from "./utils.js";
import type { ProviderLogger } from "./types.js";

const DEEPSEEK_PRICING_SOURCE = "https://api-docs.deepseek.com/quick_start/pricing";

export async function fetchDeepseekPricing(logger: ProviderLogger = () => {}): Promise<PricingModel[]> {
  try {
    const html = await fetchHtml(DEEPSEEK_PRICING_SOURCE, {
      validateHtml: (candidate) => parseDeepseekHtml(candidate).length > 0
    });
    const parsed = parseDeepseekHtml(html);
    if (parsed.length > 0) {
      logger(`live official pricing page (${parsed.length} models)`);
      return parsed;
    }
  } catch {
    // Fall back to official values if scraping fails.
  }

  logger(`fallback manual values (${getDeepseekManualFallback().length} models)`);
  return getDeepseekManualFallback();
}

export function parseDeepseekHtml(html: string): PricingModel[] {
  const $ = load(html);
  const table = $("table").first();
  if (!table.length) {
    return [];
  }

  const pricingRows = table
    .find("tr")
    .toArray()
    .map((row) =>
      $(row)
        .find("td")
        .toArray()
        .map((cell) => $(cell).text().replace(/\s+/g, " ").trim())
    );

  const cacheHitRow = pricingRows.find((row) => row.includes("1M INPUT TOKENS (CACHE HIT)"));
  const cacheMissRow = pricingRows.find((row) => row.includes("1M INPUT TOKENS (CACHE MISS)"));
  const outputRow = pricingRows.find((row) => row.includes("1M OUTPUT TOKENS"));
  if (!cacheMissRow || !outputRow) {
    return [];
  }

  const cacheHit = parseUsdAmount(cacheHitRow?.at(-1));
  const cacheMiss = parseUsdAmount(cacheMissRow.at(-1));
  const output = parseUsdAmount(outputRow.at(-1));
  if (!Number.isFinite(cacheMiss) || !Number.isFinite(output)) {
    return [];
  }

  return [
    {
      provider: "deepseek",
      model: "deepseek-chat",
      type: "text",
      input_price_per_million: cacheMiss,
      output_price_per_million: output,
      currency: "USD",
      source: DEEPSEEK_PRICING_SOURCE
    },
    {
      provider: "deepseek",
      model: "deepseek-chat-cached",
      type: "text",
      input_price_per_million: Number.isFinite(cacheHit) ? cacheHit : cacheMiss,
      output_price_per_million: output,
      currency: "USD",
      source: DEEPSEEK_PRICING_SOURCE
    },
    {
      provider: "deepseek",
      model: "deepseek-reasoner",
      type: "text",
      input_price_per_million: cacheMiss,
      output_price_per_million: output,
      currency: "USD",
      source: DEEPSEEK_PRICING_SOURCE
    }
  ];
}

export function getDeepseekManualFallback(): PricingModel[] {
  return [
    {
      provider: "deepseek",
      model: "deepseek-chat",
      type: "text",
      input_price_per_million: 0.28,
      output_price_per_million: 0.42,
      currency: "USD",
      source: DEEPSEEK_PRICING_SOURCE
    },
    {
      provider: "deepseek",
      model: "deepseek-chat-cached",
      type: "text",
      input_price_per_million: 0.028,
      output_price_per_million: 0.42,
      currency: "USD",
      source: DEEPSEEK_PRICING_SOURCE
    },
    {
      provider: "deepseek",
      model: "deepseek-reasoner",
      type: "text",
      input_price_per_million: 0.28,
      output_price_per_million: 0.42,
      currency: "USD",
      source: DEEPSEEK_PRICING_SOURCE
    }
  ];
}
