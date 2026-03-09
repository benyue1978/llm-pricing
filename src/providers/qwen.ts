import { load } from "cheerio";
import type { AnyNode } from "domhandler";
import type { PricingModel } from "../schema.js";
import { fetchHtml } from "./utils.js";

const QWEN_PRICING_SOURCE = "https://www.alibabacloud.com/help/en/model-studio/model-pricing";
const QWEN_TEXT_MODELS = [
  "qwen3-max",
  "qwen-max",
  "qwen-plus",
  "qwen-turbo",
  "qwen-long-latest",
  "qwen3-coder-plus",
  "qwen-coder-turbo"
] as const;

export async function fetchQwenPricing(): Promise<PricingModel[]> {
  try {
    const html = await fetchHtml(QWEN_PRICING_SOURCE, {
      validateHtml: (candidate) => parseQwenHtml(candidate).length > 0
    });
    const parsed = parseQwenHtml(html);
    if (parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Fall back to current official values if scraping fails.
  }

  return getQwenManualFallback();
}

export function parseQwenHtml(html: string): PricingModel[] {
  const $ = load(html);
  const models: PricingModel[] = [];

  for (const modelId of QWEN_TEXT_MODELS) {
    const row = $("tr")
      .filter((_, element) => getQwenRowModel($, element) === modelId)
      .first();
    if (!row.length) {
      continue;
    }

    const prices = row
      .find("td")
      .toArray()
      .flatMap((cell) => extractUsdAmounts($(cell).text()));
    if (prices.length < 2) {
      continue;
    }

    models.push({
      provider: "qwen",
      model: modelId,
      type: "text",
      input_price_per_million: prices[0],
      output_price_per_million: prices[1],
      currency: "USD",
      source: QWEN_PRICING_SOURCE
    });
  }

  return models;
}

function extractUsdAmounts(text: string): number[] {
  return [...text.matchAll(/\$([0-9]+(?:\.[0-9]+)?)/g)]
    .map((match) => Number.parseFloat(match[1]))
    .filter((value) => Number.isFinite(value));
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function getQwenRowModel($: ReturnType<typeof load>, element: AnyNode): string {
  const firstCell = $(element).find("td").first();
  const firstParagraph = firstCell.find("p").first().text();
  return normalizeText(firstParagraph || firstCell.text());
}

export function getQwenManualFallback(): PricingModel[] {
  return [
    {
      provider: "qwen",
      model: "qwen3-max",
      type: "text",
      input_price_per_million: 1.2,
      output_price_per_million: 6,
      currency: "USD",
      source: QWEN_PRICING_SOURCE
    },
    {
      provider: "qwen",
      model: "qwen-max",
      type: "text",
      input_price_per_million: 1.6,
      output_price_per_million: 6.4,
      currency: "USD",
      source: QWEN_PRICING_SOURCE
    },
    {
      provider: "qwen",
      model: "qwen-plus",
      type: "text",
      input_price_per_million: 0.4,
      output_price_per_million: 1.2,
      currency: "USD",
      source: QWEN_PRICING_SOURCE
    },
    {
      provider: "qwen",
      model: "qwen-turbo",
      type: "text",
      input_price_per_million: 0.05,
      output_price_per_million: 0.2,
      currency: "USD",
      source: QWEN_PRICING_SOURCE
    },
    {
      provider: "qwen",
      model: "qwen-long-latest",
      type: "text",
      input_price_per_million: 0.072,
      output_price_per_million: 0.287,
      currency: "USD",
      source: QWEN_PRICING_SOURCE
    },
    {
      provider: "qwen",
      model: "qwen3-coder-plus",
      type: "text",
      input_price_per_million: 1,
      output_price_per_million: 5,
      currency: "USD",
      source: QWEN_PRICING_SOURCE
    },
    {
      provider: "qwen",
      model: "qwen-coder-turbo",
      type: "text",
      input_price_per_million: 0.287,
      output_price_per_million: 0.861,
      currency: "USD",
      source: QWEN_PRICING_SOURCE
    }
  ];
}
