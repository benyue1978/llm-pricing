import { load } from "cheerio";
import type { PricingModel } from "../schema.js";
import {
  createTextPricingModel,
  fetchHtml,
  fetchProviderPricing,
  findTableByHeaders,
  getCellTexts,
  parseUsdAmount
} from "./utils.js";
import type { ProviderLogger } from "./types.js";

const ANTHROPIC_PRICING_SOURCE = "https://platform.claude.com/docs/en/about-claude/pricing";

export async function fetchAnthropicPricing(logger: ProviderLogger = () => {}): Promise<PricingModel[]> {
  return fetchProviderPricing({
    logger,
    fetchLive: async () => {
      const html = await fetchHtml(ANTHROPIC_PRICING_SOURCE, {
        validateHtml: (candidate) => parseAnthropicHtml(candidate).length > 0
      });
      return parseAnthropicHtml(html);
    },
    getFallback: getAnthropicManualFallback
  });
}

export function parseAnthropicHtml(html: string): PricingModel[] {
  const $ = load(html);
  const table = findTableByHeaders($, ["Base Input Tokens", "Output Tokens"]);

  const models: PricingModel[] = [];
  table.find("tbody tr").each((_, row) => {
    const cells = getCellTexts($, row);
    const [displayName, inputRaw, , , , outputRaw] = cells;
    if (!displayName || displayName.includes("deprecated")) {
      return;
    }

    const input = parseUsdAmount(inputRaw);
    const output = parseUsdAmount(outputRaw);
    if (!Number.isFinite(input) || !Number.isFinite(output)) {
      return;
    }

    models.push(createTextPricingModel({
      provider: "anthropic",
      model: normalizeAnthropicModel(displayName),
      input,
      output,
      currency: "USD",
      source: ANTHROPIC_PRICING_SOURCE
    }));
  });

  return models;
}

function normalizeAnthropicModel(displayName: string): string {
  return displayName.toLowerCase().replace(/^claude\s+/, "claude-").replace(/\s+/g, "-");
}

export function getAnthropicManualFallback(): PricingModel[] {
  return [
    {
      provider: "anthropic",
      model: "claude-opus-4.6",
      type: "text",
      input_price_per_million: 5,
      output_price_per_million: 25,
      currency: "USD",
      source: ANTHROPIC_PRICING_SOURCE
    },
    {
      provider: "anthropic",
      model: "claude-sonnet-4.6",
      type: "text",
      input_price_per_million: 3,
      output_price_per_million: 15,
      currency: "USD",
      source: ANTHROPIC_PRICING_SOURCE
    },
    {
      provider: "anthropic",
      model: "claude-haiku-4.5",
      type: "text",
      input_price_per_million: 1,
      output_price_per_million: 5,
      currency: "USD",
      source: ANTHROPIC_PRICING_SOURCE
    }
  ];
}
