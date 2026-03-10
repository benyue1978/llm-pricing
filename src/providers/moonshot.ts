import type { PricingModel } from "../schema.js";
import {
  createTextPricingModel,
  extractAssignedArray,
  extractConditionalAssignedArray,
  fetchHtml,
  fetchProviderPricing,
  fetchText,
  findScriptSrc,
  getJsNumberProperty,
  getJsStringProperty,
  splitTopLevelObjects
} from "./utils.js";
import type { ProviderLogger } from "./types.js";

const MOONSHOT_PRICING_SOURCE = "https://platform.moonshot.ai/docs/pricing/chat";

export async function fetchMoonshotPricing(logger: ProviderLogger = () => {}): Promise<PricingModel[]> {
  return fetchProviderPricing({
    logger,
    fetchLive: async () => {
      const html = await fetchHtml(MOONSHOT_PRICING_SOURCE, {
        validateHtml: (candidate) => candidate.includes("_app-") && candidate.includes("/_next/static/chunks/pages/")
      });
      const appScriptUrl = findMoonshotAppScriptUrl(html);
      if (!appScriptUrl) {
        throw new Error("Moonshot app script not found");
      }

      const appScript = await fetchText(appScriptUrl, {
        accept: "application/javascript,text/javascript,*/*",
        validateText: (candidate) => parseMoonshotAppScript(candidate).length > 0
      });
      return parseMoonshotAppScript(appScript);
    },
    getFallback: getMoonshotManualFallback,
    describeLive: (models) => `live official app bundle (${models.length} models)`
  });
}

export function parseMoonshotAppScript(script: string): PricingModel[] {
  const modelArrays = [
    extractAssignedArray(script, "ev="),
    extractConditionalAssignedArray(script, "ez=ei.lJ?", "truthy"),
    extractConditionalAssignedArray(script, "eE=ei.lJ?", "truthy")
  ].filter((value): value is string => Boolean(value));

  const models: PricingModel[] = [];
  const seen = new Set<string>();

  for (const arrayLiteral of modelArrays) {
    for (const objectLiteral of splitTopLevelObjects(arrayLiteral)) {
      const model = getJsStringProperty(objectLiteral, "model_id");
      const input = getJsNumberProperty(objectLiteral, "prompt");
      const output = getJsNumberProperty(objectLiteral, "completion");
      const unit = getJsStringProperty(objectLiteral, "unit")?.toLowerCase() ?? "";

      if (!model || seen.has(model) || !shouldIncludeMoonshotModel(model) || !unit.includes("1m tokens")) {
        continue;
      }

      if (input === null || output === null) {
        continue;
      }

      seen.add(model);
      models.push(createTextPricingModel({
        provider: "moonshot",
        model,
        input,
        output,
        currency: "USD",
        source: MOONSHOT_PRICING_SOURCE
      }));
    }
  }

  return models;
}

export function findMoonshotAppScriptUrl(html: string): string | null {
  return findScriptSrc(
    html,
    (src) => src.includes("/_next/static/chunks/pages/_app-") && src.endsWith(".js"),
    MOONSHOT_PRICING_SOURCE
  );
}

function shouldIncludeMoonshotModel(model: string): boolean {
  return !model.toLowerCase().includes("vision");
}

export function getMoonshotManualFallback(): PricingModel[] {
  return [
    {
      provider: "moonshot",
      model: "kimi-k2.5",
      type: "text",
      input_price_per_million: 0.6,
      output_price_per_million: 3,
      currency: "USD",
      source: MOONSHOT_PRICING_SOURCE
    },
    {
      provider: "moonshot",
      model: "kimi-k2-0905-preview",
      type: "text",
      input_price_per_million: 0.6,
      output_price_per_million: 2.5,
      currency: "USD",
      source: MOONSHOT_PRICING_SOURCE
    },
    {
      provider: "moonshot",
      model: "kimi-k2-0711-preview",
      type: "text",
      input_price_per_million: 0.6,
      output_price_per_million: 2.5,
      currency: "USD",
      source: MOONSHOT_PRICING_SOURCE
    },
    {
      provider: "moonshot",
      model: "kimi-k2-turbo-preview",
      type: "text",
      input_price_per_million: 1.15,
      output_price_per_million: 8,
      currency: "USD",
      source: MOONSHOT_PRICING_SOURCE
    },
    {
      provider: "moonshot",
      model: "kimi-k2-thinking",
      type: "text",
      input_price_per_million: 0.6,
      output_price_per_million: 2.5,
      currency: "USD",
      source: MOONSHOT_PRICING_SOURCE
    },
    {
      provider: "moonshot",
      model: "kimi-k2-thinking-turbo",
      type: "text",
      input_price_per_million: 1.15,
      output_price_per_million: 8,
      currency: "USD",
      source: MOONSHOT_PRICING_SOURCE
    },
    {
      provider: "moonshot",
      model: "moonshot-v1-8k",
      type: "text",
      input_price_per_million: 0.2,
      output_price_per_million: 2,
      currency: "USD",
      source: MOONSHOT_PRICING_SOURCE
    },
    {
      provider: "moonshot",
      model: "moonshot-v1-32k",
      type: "text",
      input_price_per_million: 1,
      output_price_per_million: 3,
      currency: "USD",
      source: MOONSHOT_PRICING_SOURCE
    },
    {
      provider: "moonshot",
      model: "moonshot-v1-128k",
      type: "text",
      input_price_per_million: 2,
      output_price_per_million: 5,
      currency: "USD",
      source: MOONSHOT_PRICING_SOURCE
    }
  ];
}
