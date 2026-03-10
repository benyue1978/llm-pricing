import { load } from "cheerio";
import type { AnyNode } from "domhandler";
import type { PricingModel } from "../schema.js";
import {
  createTextPricingModel,
  fetchProviderPricing,
  fetchRenderedHtml,
  findNextTable,
  normalizeText,
  parseUsdAmount
} from "./utils.js";
import type { ProviderLogger } from "./types.js";

const MOONSHOT_PRICING_SOURCE = "https://platform.moonshot.ai/docs/pricing/chat";

export async function fetchMoonshotPricing(logger: ProviderLogger = () => {}): Promise<PricingModel[]> {
  return fetchProviderPricing({
    logger,
    fetchLive: async () => {
      const html = await fetchRenderedHtml(MOONSHOT_PRICING_SOURCE, {
        validateHtml: (candidate) => parseMoonshotHtml(candidate).length > 0
      });
      return parseMoonshotHtml(html);
    },
    getFallback: getMoonshotManualFallback,
    describeLive: (models) => `live rendered official pricing page (${models.length} models)`
  });
}

export function parseMoonshotHtml(html: string): PricingModel[] {
  const $ = load(html);
  const models: PricingModel[] = [];
  const seen = new Set<string>();
  const headings = $("h3").toArray();

  for (const heading of headings) {
    const headingText = normalizeText($(heading).text()).toLowerCase();
    if (!headingText.includes("kimi-k2.5") && !headingText.includes("kimi-k2") && !headingText.includes("moonshot-v1")) {
      continue;
    }

    const table = findMoonshotPricingTable($, heading);
    if (!table.length) {
      continue;
    }

    table.find("tr").each((_, row) => {
      const cells = $(row)
        .find("td")
        .toArray()
        .map((cell) => normalizeText($(cell).text()));
      const model = cells[0];
      const unit = (cells[1] ?? "").toLowerCase();
      if (!model || seen.has(model) || !unit.includes("1m tokens") || !shouldIncludeMoonshotModel(model)) {
        return;
      }

      const input = parseUsdAmount(cells[2]);
      const output = cells.length >= 6 ? parseUsdAmount(cells[4]) : parseUsdAmount(cells[3]);
      if (!Number.isFinite(input) || !Number.isFinite(output)) {
        return;
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
    });
  }

  return models;
}

function findMoonshotPricingTable($: ReturnType<typeof load>, heading: AnyNode) {
  return findNextTable($, $(heading));
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
      input_price_per_million: 0.1,
      output_price_per_million: 3,
      currency: "USD",
      source: MOONSHOT_PRICING_SOURCE
    },
    {
      provider: "moonshot",
      model: "kimi-k2-0905-preview",
      type: "text",
      input_price_per_million: 0.15,
      output_price_per_million: 2.5,
      currency: "USD",
      source: MOONSHOT_PRICING_SOURCE
    },
    {
      provider: "moonshot",
      model: "kimi-k2-turbo-preview",
      type: "text",
      input_price_per_million: 0.15,
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
