import { load, type Cheerio, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import type { PricingModel } from "../schema.js";
import { fetchHtml, parseUsdAmount } from "./utils.js";

const GOOGLE_PRICING_SOURCE = "https://ai.google.dev/gemini-api/docs/pricing";
const GOOGLE_TEXT_MODEL_IDS = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"] as const;

export async function fetchGooglePricing(): Promise<PricingModel[]> {
  try {
    const html = await fetchHtml(GOOGLE_PRICING_SOURCE, {
      validateHtml: (candidate) => parseGoogleHtml(candidate).length > 0
    });
    const parsed = parseGoogleHtml(html);
    if (parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Fall back to official values if scraping fails.
  }

  return getGoogleManualFallback();
}

export function parseGoogleHtml(html: string): PricingModel[] {
  const $ = load(html);
  const models: PricingModel[] = [];

  for (const modelId of GOOGLE_TEXT_MODEL_IDS) {
    const heading = $(`[id="${modelId}"]`).first();
    if (!heading.length) {
      continue;
    }

    const table = findGooglePricingTable($, heading);
    const rows = table.find("tr").toArray();
    const inputRow = rows.find((row) => $(row).text().includes("Input price"));
    const outputRow = rows.find((row) => $(row).text().includes("Output price"));
    if (!inputRow || !outputRow) {
      continue;
    }

    const input = parseUsdAmount($(inputRow).find("td").eq(2).text());
    const output = parseUsdAmount($(outputRow).find("td").eq(2).text());
    if (!Number.isFinite(input) || !Number.isFinite(output)) {
      continue;
    }

    models.push({
      provider: "google",
      model: modelId,
      type: "text",
      input_price_per_million: input,
      output_price_per_million: output,
      currency: "USD",
      source: GOOGLE_PRICING_SOURCE
    });
  }

  return models;
}

function findGooglePricingTable(
  $: CheerioAPI,
  heading: Cheerio<AnyNode>
): Cheerio<AnyNode> {
  const section = heading.closest(".models-section");
  let current = section.length ? section.next() : heading.next();

  while (current.length) {
    if (current.hasClass("models-section") || current.find(".models-section").length) {
      break;
    }

    if (current.is("table")) {
      return current;
    }

    const nestedTable = current.find("table").first();
    if (nestedTable.length) {
      return nestedTable;
    }

    current = current.next();
  }

  return $("");
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
