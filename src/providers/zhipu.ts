import type { PricingModel } from "../schema.js";
import { load } from "cheerio";
import {
  createTextPricingModel,
  fetchProviderPricing,
  fetchRenderedHtml,
  normalizeText,
  parseCnyAmount
} from "./utils.js";
import type { ProviderLogger } from "./types.js";

const ZHIPU_PRICING_SOURCE = "https://open.bigmodel.cn/pricing";

export async function fetchZhipuPricing(logger: ProviderLogger = () => {}): Promise<PricingModel[]> {
  return fetchProviderPricing({
    logger,
    fetchLive: async () => {
      const html = await fetchRenderedHtml(ZHIPU_PRICING_SOURCE, {
        validateHtml: (candidate) => parseZhipuHtml(candidate).length > 0
      });
      return parseZhipuHtml(html);
    },
    getFallback: getZhipuManualFallback,
    describeLive: (models) => `live rendered official pricing page (${models.length} models)`
  });
}

export function parseZhipuHtml(html: string): PricingModel[] {
  const $ = load(html);
  const models: PricingModel[] = [];
  const seen = new Set<string>();

  $("div.model-price-item-bottom.langue_model table.el-table__body tbody").each((_, tbody) => {
    let currentModel = "";

    $(tbody)
      .find("tr")
      .each((_, row) => {
        const cells = $(row).find("td");
        if (!cells.length) {
          return;
        }

        const firstCellText = normalizeZhipuModel(cells.eq(0).text());
        const rowModel = cells.length >= 6 ? firstCellText : currentModel;
        if (cells.length >= 6) {
          currentModel = rowModel;
        }

        if (!rowModel || seen.has(rowModel) || !shouldIncludeZhipuModel(rowModel)) {
          return;
        }

        const inputIndex = cells.length >= 6 ? 2 : 1;
        const outputIndex = cells.length >= 6 ? 3 : 2;
        const input = parseCnyAmount(cells.eq(inputIndex).text());
        const output = parseCnyAmount(cells.eq(outputIndex).text());
        if (!Number.isFinite(input) || !Number.isFinite(output)) {
          return;
        }

        seen.add(rowModel);
        models.push(createTextPricingModel({
          provider: "zhipu",
          model: rowModel,
          input,
          output,
          currency: "CNY",
          source: ZHIPU_PRICING_SOURCE
        }));
      });
  });

  return models;
}

function normalizeZhipuModel(value: string): string {
  return normalizeText(value)
    .replace(/\s+(?:new|coming soon)$/i, "")
    .trim();
}

export function getZhipuManualFallback(): PricingModel[] {
  return [
    {
      provider: "zhipu",
      model: "GLM-5",
      type: "text",
      input_price_per_million: 4,
      output_price_per_million: 18,
      currency: "CNY",
      source: ZHIPU_PRICING_SOURCE
    },
    {
      provider: "zhipu",
      model: "GLM-5-Code",
      type: "text",
      input_price_per_million: 6,
      output_price_per_million: 28,
      currency: "CNY",
      source: ZHIPU_PRICING_SOURCE
    },
    {
      provider: "zhipu",
      model: "GLM-4.7",
      type: "text",
      input_price_per_million: 2,
      output_price_per_million: 8,
      currency: "CNY",
      source: ZHIPU_PRICING_SOURCE
    },
    {
      provider: "zhipu",
      model: "GLM-4.5-Air",
      type: "text",
      input_price_per_million: 0.8,
      output_price_per_million: 2,
      currency: "CNY",
      source: ZHIPU_PRICING_SOURCE
    },
    {
      provider: "zhipu",
      model: "GLM-4.7-FlashX",
      type: "text",
      input_price_per_million: 0.5,
      output_price_per_million: 3,
      currency: "CNY",
      source: ZHIPU_PRICING_SOURCE
    }
  ];
}

function shouldIncludeZhipuModel(model: string): boolean {
  const normalized = model.toLowerCase();
  return !/\bglm-[\d.]+v(?:[-\s]|$)/i.test(normalized) &&
    !normalized.includes("voice") &&
    !normalized.includes("tts") &&
    !normalized.includes("asr") &&
    !normalized.includes("image") &&
    !normalized.includes("embedding") &&
    !normalized.includes("cog") &&
    !normalized.includes("rerank") &&
    !normalized.includes("charglm") &&
    !normalized.includes("emohaa");
}
