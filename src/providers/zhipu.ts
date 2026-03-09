import type { PricingModel } from "../schema.js";
import { fetchHtml, fetchJson, parseCnyAmount } from "./utils.js";

const ZHIPU_PRICING_SOURCE = "https://open.bigmodel.cn/pricing";
const ZHIPU_PRICING_DATA_URL = "https://open.bigmodel.cn/api/biz/operation/query?ids=1122";

interface ZhipuOperationResponse {
  data?: Array<{ content?: string }>;
}

interface ZhipuSectionContent {
  list?: Array<{
    modelNameEn?: string;
    fieldListEn?: Array<{ code?: string; label?: string }>;
    modelListEn?: Array<Record<string, string | number | undefined>>;
  }>;
}

export async function fetchZhipuPricing(): Promise<PricingModel[]> {
  try {
    await fetchHtml(ZHIPU_PRICING_SOURCE, {
      validateHtml: (candidate) => candidate.includes('<div id="app">')
    });
    const payload = await fetchJson<ZhipuOperationResponse>(ZHIPU_PRICING_DATA_URL, {
      validateJson: (candidate) => parseZhipuPayload(candidate).length > 0
    });
    const parsed = parseZhipuPayload(payload);
    if (parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Fall back to current official values if scraping fails.
  }

  return getZhipuManualFallback();
}

export function parseZhipuPayload(payload: ZhipuOperationResponse): PricingModel[] {
  const contentRaw = payload.data?.[0]?.content;
  if (!contentRaw) {
    return [];
  }

  const content = JSON.parse(contentRaw) as ZhipuSectionContent;
  const languageSection = content.list?.find((section) => section.modelNameEn === "Language Models");
  if (!languageSection) {
    return [];
  }

  const modelField = languageSection.fieldListEn?.find((field) => field.label?.trim() === "Model")?.code;
  const priceField = languageSection.fieldListEn?.find((field) => field.label?.trim() === "Pricing")?.code;
  if (!modelField || !priceField) {
    return [];
  }

  const models: PricingModel[] = [];
  for (const row of languageSection.modelListEn ?? []) {
    const model = normalizeText(String(row[modelField] ?? ""));
    const input = parseCnyAmount(String(row[priceField] ?? ""));
    if (!model || !Number.isFinite(input)) {
      continue;
    }

    models.push({
      provider: "zhipu",
      model,
      type: "text",
      input_price_per_million: input,
      output_price_per_million: null,
      currency: "CNY",
      source: ZHIPU_PRICING_SOURCE
    });
  }

  return models;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function getZhipuManualFallback(): PricingModel[] {
  return [
    {
      provider: "zhipu",
      model: "GLM-4-Plus",
      type: "text",
      input_price_per_million: 5,
      output_price_per_million: null,
      currency: "CNY",
      source: ZHIPU_PRICING_SOURCE
    },
    {
      provider: "zhipu",
      model: "GLM-4-Air",
      type: "text",
      input_price_per_million: 0.5,
      output_price_per_million: null,
      currency: "CNY",
      source: ZHIPU_PRICING_SOURCE
    },
    {
      provider: "zhipu",
      model: "GLM-4-AirX",
      type: "text",
      input_price_per_million: 10,
      output_price_per_million: null,
      currency: "CNY",
      source: ZHIPU_PRICING_SOURCE
    },
    {
      provider: "zhipu",
      model: "GLM-4-FlashX-250414",
      type: "text",
      input_price_per_million: 0.1,
      output_price_per_million: null,
      currency: "CNY",
      source: ZHIPU_PRICING_SOURCE
    },
    {
      provider: "zhipu",
      model: "GLM-4-Long",
      type: "text",
      input_price_per_million: 1,
      output_price_per_million: null,
      currency: "CNY",
      source: ZHIPU_PRICING_SOURCE
    },
    {
      provider: "zhipu",
      model: "GLM-4-Assistant",
      type: "text",
      input_price_per_million: 5,
      output_price_per_million: null,
      currency: "CNY",
      source: ZHIPU_PRICING_SOURCE
    }
  ];
}
