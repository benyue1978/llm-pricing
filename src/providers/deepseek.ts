import { load } from "cheerio";
import type { PricingModel } from "../schema.js";
import {
  createTextPricingModel,
  fetchHtml,
  fetchProviderPricing,
  getCellTexts,
  parseUsdAmount
} from "./utils.js";
import type { ProviderLogger } from "./types.js";

const DEEPSEEK_PRICING_SOURCE = "https://api-docs.deepseek.com/quick_start/pricing";

export async function fetchDeepseekPricing(logger: ProviderLogger = () => {}): Promise<PricingModel[]> {
  return fetchProviderPricing({
    logger,
    fetchLive: async () => {
      const html = await fetchHtml(DEEPSEEK_PRICING_SOURCE, {
        validateHtml: (candidate) => parseDeepseekHtml(candidate).length > 0
      });
      return parseDeepseekHtml(html);
    },
    getFallback: getDeepseekManualFallback
  });
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
    .map((row) => getCellTexts($, row));

  const modelRow = pricingRows.find((row) => row.at(0) === "MODEL");
  const modelNames = modelRow
    ?.slice(1)
    .map(normalizeDeepseekModelName)
    .filter((model) => model.startsWith("deepseek-"));
  const cacheHitRow = findPricingRow(pricingRows, "1M INPUT TOKENS (CACHE HIT)");
  const cacheMissRow = findPricingRow(pricingRows, "1M INPUT TOKENS (CACHE MISS)");
  const outputRow = findPricingRow(pricingRows, "1M OUTPUT TOKENS");
  if (!modelNames?.length || !cacheMissRow || !outputRow) {
    return [];
  }

  const models: PricingModel[] = [];

  for (const [index, model] of modelNames.entries()) {
    const cacheHit = parseUsdAmount(getModelPriceCell(cacheHitRow, index));
    const cacheMiss = parseUsdAmount(getModelPriceCell(cacheMissRow, index));
    const output = parseUsdAmount(getModelPriceCell(outputRow, index));
    if (!Number.isFinite(cacheMiss) || !Number.isFinite(output)) {
      continue;
    }

    models.push(
      createTextPricingModel({
        provider: "deepseek",
        model,
        input: cacheMiss,
        output,
        currency: "USD",
        source: DEEPSEEK_PRICING_SOURCE
      })
    );

    if (Number.isFinite(cacheHit) && cacheHit !== cacheMiss) {
      models.push(
        createTextPricingModel({
          provider: "deepseek",
          model: `${model}-cached`,
          input: cacheHit,
          output,
          currency: "USD",
          source: DEEPSEEK_PRICING_SOURCE
        })
      );
    }
  }

  return models;
}

function normalizeDeepseekModelName(value: string): string {
  return value.replace(/\(\d+\)$/u, "").trim();
}

function findPricingRow(rows: string[][], label: string): string[] | undefined {
  return rows.find((row) => row.some((cell) => cell.includes(label)));
}

function getModelPriceCell(row: string[] | undefined, modelIndex: number): string | undefined {
  if (!row) {
    return undefined;
  }
  const labelIndex = row.findIndex((cell) => cell.includes("1M ") && cell.includes("TOKENS"));
  const priceStartIndex = labelIndex >= 0 ? labelIndex + 1 : 1;
  return row[priceStartIndex + modelIndex] ?? row.at(-1);
}

export function getDeepseekManualFallback(): PricingModel[] {
  return [
    {
      provider: "deepseek",
      model: "deepseek-v4-flash",
      type: "text",
      input_price_per_million: 0.14,
      output_price_per_million: 0.28,
      currency: "USD",
      source: DEEPSEEK_PRICING_SOURCE
    },
    {
      provider: "deepseek",
      model: "deepseek-v4-flash-cached",
      type: "text",
      input_price_per_million: 0.0028,
      output_price_per_million: 0.28,
      currency: "USD",
      source: DEEPSEEK_PRICING_SOURCE
    },
    {
      provider: "deepseek",
      model: "deepseek-v4-pro",
      type: "text",
      input_price_per_million: 0.435,
      output_price_per_million: 0.87,
      currency: "USD",
      source: DEEPSEEK_PRICING_SOURCE
    },
    {
      provider: "deepseek",
      model: "deepseek-v4-pro-cached",
      type: "text",
      input_price_per_million: 0.003625,
      output_price_per_million: 0.87,
      currency: "USD",
      source: DEEPSEEK_PRICING_SOURCE
    }
  ];
}
