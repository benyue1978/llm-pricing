import { load } from "cheerio";
import type { PricingModel } from "../schema.js";
import { fetchHtml, parseUsdAmount } from "./utils.js";

const ANTHROPIC_PRICING_SOURCE = "https://platform.claude.com/docs/en/about-claude/pricing";

export async function fetchAnthropicPricing(): Promise<PricingModel[]> {
  try {
    const html = await fetchHtml(ANTHROPIC_PRICING_SOURCE, {
      validateHtml: (candidate) => parseAnthropicHtml(candidate).length > 0
    });
    const parsed = parseAnthropicHtml(html);
    if (parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Fall back to official values if scraping fails.
  }

  return getAnthropicManualFallback();
}

export function parseAnthropicHtml(html: string): PricingModel[] {
  const $ = load(html);
  const table = $("table")
    .filter((_, tableEl) => {
      const headers = $(tableEl)
        .find("th")
        .toArray()
        .map((el) => $(el).text().trim());
      return headers.includes("Base Input Tokens") && headers.includes("Output Tokens");
    })
    .first();

  const models: PricingModel[] = [];
  table.find("tbody tr").each((_, row) => {
    const cells = $(row)
      .find("td")
      .toArray()
      .map((cell) => $(cell).text().replace(/\s+/g, " ").trim());
    const [displayName, inputRaw, , , , outputRaw] = cells;
    if (!displayName || displayName.includes("deprecated")) {
      return;
    }

    const input = parseUsdAmount(inputRaw);
    const output = parseUsdAmount(outputRaw);
    if (!Number.isFinite(input) || !Number.isFinite(output)) {
      return;
    }

    models.push({
      provider: "anthropic",
      model: normalizeAnthropicModel(displayName),
      type: "text",
      input_price_per_million: input,
      output_price_per_million: output,
      currency: "USD",
      source: ANTHROPIC_PRICING_SOURCE
    });
  });

  return models;
}

function normalizeAnthropicModel(displayName: string): string {
  return displayName.toLowerCase().replace(/^claude\s+/, "claude-").replace(/\s+/g, "-");
}

export function getAnthropicManualFallback(): Promise<PricingModel[]> | PricingModel[] {
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
