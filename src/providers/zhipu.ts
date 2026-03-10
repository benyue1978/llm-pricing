import type { PricingModel } from "../schema.js";
import {
  createTextPricingModel,
  extractBracketedValue,
  fetchHtml,
  fetchProviderPricing,
  fetchText,
  findScriptSrc,
  getJsStringArrayFirst,
  getJsStringProperty,
  normalizeText,
  parseCnyAmount,
  splitTopLevelObjects
} from "./utils.js";
import type { ProviderLogger } from "./types.js";

const ZHIPU_PRICING_SOURCE = "https://open.bigmodel.cn/pricing";

export async function fetchZhipuPricing(logger: ProviderLogger = () => {}): Promise<PricingModel[]> {
  return fetchProviderPricing({
    logger,
    fetchLive: async () => {
      const html = await fetchHtml(ZHIPU_PRICING_SOURCE, {
        validateHtml: (candidate) => candidate.includes("/js/app.") && candidate.includes("chunk-vendors")
      });
      const appScriptUrl = findZhipuAppScriptUrl(html);
      if (!appScriptUrl) {
        throw new Error("Zhipu app script not found");
      }

      const appScript = await fetchText(appScriptUrl, {
        accept: "application/javascript,text/javascript,*/*",
        validateText: (candidate) => parseZhipuAppScript(candidate).length > 0
      });
      return parseZhipuAppScript(appScript);
    },
    getFallback: getZhipuManualFallback,
    describeLive: (models) => `live official app bundle (${models.length} models)`
  });
}

export function parseZhipuAppScript(script: string): PricingModel[] {
  const textModelArray = extractZhipuTextModelArray(script);
  if (!textModelArray) {
    return [];
  }

  const models: PricingModel[] = [];
  const seen = new Set<string>();
  let currentModel = "";

  for (const objectLiteral of splitTopLevelObjects(textModelArray)) {
    const name = normalizeZhipuModel(getJsStringProperty(objectLiteral, "name") ?? "");
    const rowModel = name || currentModel;
    if (name) {
      currentModel = name;
    }

    if (!rowModel || seen.has(rowModel) || !shouldIncludeZhipuModel(rowModel)) {
      continue;
    }

    const input = parseCnyAmount(getJsStringArrayFirst(objectLiteral, "inPrice") ?? undefined);
    const output = parseCnyAmount(getJsStringArrayFirst(objectLiteral, "outPrice") ?? undefined);
    if (!Number.isFinite(input) || !Number.isFinite(output)) {
      continue;
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
  }

  return models;
}

export function findZhipuAppScriptUrl(html: string): string | null {
  return findScriptSrc(
    html,
    (src) => /\/js\/app\.[^/]+\.js$/.test(src),
    ZHIPU_PRICING_SOURCE
  );
}

function extractZhipuTextModelArray(script: string): string | null {
  const sectionIndex = script.indexOf('modelName:"Text model"');
  if (sectionIndex < 0) {
    return null;
  }

  const modelListIndex = script.indexOf("modelList:[", sectionIndex);
  if (modelListIndex < 0) {
    return null;
  }

  const openIndex = script.indexOf("[", modelListIndex);
  return extractBracketedValue(script, openIndex, "[", "]");
}

function normalizeZhipuModel(value: string): string {
  return normalizeText(value)
    .replace(/\s+(?:new|coming soon|limited-time.*)$/i, "")
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
