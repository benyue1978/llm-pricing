import { load } from "cheerio";
import type { AnyNode } from "domhandler";
import type { PricingModel } from "../schema.js";
import { fetchHtml } from "./utils.js";
import type { ProviderLogger } from "./types.js";

const QWEN_PRICING_SOURCE = "https://www.alibabacloud.com/help/en/model-studio/model-pricing";

export async function fetchQwenPricing(logger: ProviderLogger = () => {}): Promise<PricingModel[]> {
  try {
    const html = await fetchHtml(QWEN_PRICING_SOURCE, {
      validateHtml: (candidate) => parseQwenHtml(candidate).length > 0
    });
    const parsed = parseQwenHtml(html);
    if (parsed.length > 0) {
      logger(`live official pricing page (${parsed.length} models)`);
      return parsed;
    }
  } catch {
    // Fall back to current official values if scraping fails.
  }

  logger(`fallback manual values (${getQwenManualFallback().length} models)`);
  return getQwenManualFallback();
}

export function parseQwenHtml(html: string): PricingModel[] {
  const $ = load(html);
  const models: PricingModel[] = [];
  const seen = new Set<string>();

  $("table").each((_, table) => {
    const headers = $(table)
      .find("th, td")
      .slice(0, 8)
      .toArray()
      .map((cell) => normalizeText($(cell).text()).toLowerCase());

    const joinedHeaders = headers.join(" ");
    if (!joinedHeaders.includes("model") || !joinedHeaders.includes("input price") || !joinedHeaders.includes("output price")) {
      return;
    }

    $(table)
      .find("tr")
      .each((_, row) => {
        const modelId = getQwenRowModel($, row);
        if (!modelId || seen.has(modelId) || !shouldIncludeQwenModel(modelId)) {
          return;
        }

        const prices = $(row)
          .find("td")
          .toArray()
          .flatMap((cell) => extractUsdAmounts($(cell).text()));
        if (prices.length < 2) {
          return;
        }

        seen.add(modelId);
        models.push({
          provider: "qwen",
          model: modelId,
          type: "text",
          input_price_per_million: prices[0],
          output_price_per_million: prices[1],
          currency: "USD",
          source: QWEN_PRICING_SOURCE
        });
      });
  });

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
  const rawModel = normalizeText(firstParagraph || firstCell.text());
  const matchedModel = rawModel.toLowerCase().match(/^[a-z0-9.]+(?:-[a-z0-9.]+)+/);
  return matchedModel?.[0] ?? "";
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

function shouldIncludeQwenModel(model: string): boolean {
  const normalized = model.toLowerCase();
  return !normalized.includes("omni") && !normalized.includes("audio") && !normalized.includes("image");
}
