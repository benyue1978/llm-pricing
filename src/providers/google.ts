import { load, type Cheerio, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import type { PricingModel } from "../schema.js";
import {
  createTextPricingModel,
  fetchHtml,
  fetchProviderPricing,
  findNextTable,
  parseUsdAmount
} from "./utils.js";
import type { ProviderLogger } from "./types.js";

const GOOGLE_PRICING_SOURCE = "https://ai.google.dev/gemini-api/docs/pricing";

export async function fetchGooglePricing(logger: ProviderLogger = () => {}): Promise<PricingModel[]> {
  return fetchProviderPricing({
    logger,
    fetchLive: async () => {
      const html = await fetchHtml(GOOGLE_PRICING_SOURCE, {
        validateHtml: (candidate) => parseGoogleHtml(candidate).length > 0
      });
      return parseGoogleHtml(html);
    },
    getFallback: getGoogleManualFallback
  });
}

export function parseGoogleHtml(html: string): PricingModel[] {
  const $ = load(html);
  const models: PricingModel[] = [];
  const seen = new Set<string>();

  $(".models-section h2[id]").each((_, element) => {
    const heading = $(element);
    const modelId = heading.attr("id")?.trim();
    if (!modelId || seen.has(modelId)) {
      return;
    }

    const table = findGooglePricingTable($, heading);
    const rows = table.find("tr").toArray();
    const inputRow = rows.find((row) => $(row).text().includes("Input price"));
    const outputRow = rows.find((row) => $(row).text().includes("Output price"));
    if (!inputRow || !outputRow) {
      return;
    }

    const input = parseUsdAmount($(inputRow).find("td").eq(2).text());
    const output = parseUsdAmount($(outputRow).find("td").eq(2).text());
    if (!Number.isFinite(input) || !Number.isFinite(output)) {
      return;
    }

    seen.add(modelId);
    models.push(createTextPricingModel({
      provider: "google",
      model: modelId,
      input,
      output,
      currency: "USD",
      source: GOOGLE_PRICING_SOURCE
    }));
  });

  return models;
}

function findGooglePricingTable(
  $: CheerioAPI,
  heading: Cheerio<AnyNode>
): Cheerio<AnyNode> {
  const section = heading.closest(".models-section");
  return findNextTable($, section.length ? section : heading, {
    stopAt: (current) => current.hasClass("models-section") || current.find(".models-section").length > 0
  });
}

export function getGoogleManualFallback(): PricingModel[] {
  return [
    {
      provider: "google",
      model: "gemini-2.5-pro",
      type: "text",
      input_price_per_million: 1.25,
      output_price_per_million: 10,
      currency: "USD",
      source: GOOGLE_PRICING_SOURCE
    },
    {
      provider: "google",
      model: "gemini-2.5-flash",
      type: "text",
      input_price_per_million: 0.3,
      output_price_per_million: 2.5,
      currency: "USD",
      source: GOOGLE_PRICING_SOURCE
    },
    {
      provider: "google",
      model: "gemini-2.5-flash-lite",
      type: "text",
      input_price_per_million: 0.1,
      output_price_per_million: 0.4,
      currency: "USD",
      source: GOOGLE_PRICING_SOURCE
    }
  ];
}
