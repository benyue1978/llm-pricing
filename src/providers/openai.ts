import { load } from "cheerio";
import type { AnyNode } from "domhandler";
import type { PricingModel } from "../schema.js";
import { fetchHtml, parseUsdAmount } from "./utils.js";

const OPENAI_PRICING_URL = "https://platform.openai.com/pricing";
const OPENAI_PRICING_DOCS_URL = "https://developers.openai.com/api/docs/pricing";
const OPENAI_TEXT_SWITCHER_ID = "latest-pricing";

export async function fetchOpenAIPricing(): Promise<PricingModel[]> {
  for (const url of [OPENAI_PRICING_DOCS_URL, OPENAI_PRICING_URL]) {
    try {
      const html = await fetchHtml(url, {
        validateHtml: (candidate) => parseOpenAIHtml(candidate).length > 0
      });
      const parsed = parseOpenAIHtml(html);
      if (parsed.length > 0) {
        return parsed;
      }
    } catch {
      // Try the next official endpoint before falling back to manual values.
    }
  }

  return getOpenAIManualFallback();
}

export function parseOpenAIHtml(html: string): PricingModel[] {
  const $ = load(html);
  const paneSelector =
    `[data-content-switcher-root][data-content-switcher-id="${OPENAI_TEXT_SWITCHER_ID}"] ` +
    `[data-content-switcher-pane][data-value="standard"]`;
  const tableCandidates: AnyNode[] = [
    ...$(paneSelector).find("table").toArray(),
    ...findTextTokenTables($)
  ];
  const models = new Map<string, PricingModel>();

  for (const table of tableCandidates) {
    $(table)
      .find("tbody tr")
      .each((_, row) => {
        const cells = $(row)
          .find("td")
          .toArray()
          .map((cell) => $(cell).text().replace(/\s+/g, " ").trim());

        const [model, inputRaw, _cachedInputRaw, outputRaw] = cells;
        if (!model || models.has(model) || !shouldIncludeOpenAITextModel(model)) {
          return;
        }

        const input = parseUsdPrice(inputRaw);
        const output = parseUsdPrice(outputRaw);
        if (!Number.isFinite(input)) {
          return;
        }

        models.set(model, {
          provider: "openai",
          model,
          type: "text",
          input_price_per_million: input,
          output_price_per_million: Number.isFinite(output) ? output : null,
          currency: "USD",
          source: OPENAI_PRICING_URL
        });
      });
  }

  return [...models.values()];
}

function findTextTokenTables($: ReturnType<typeof load>): AnyNode[] {
  const heading = $("h2[data-name='text-tokens'], h2#text-tokens").first();
  if (!heading.length) {
    return [];
  }

  const tables: AnyNode[] = [];
  let current = heading.parent().length ? heading.parent().next() : heading.next();

  while (current.length) {
    const tagName = current.get(0)?.tagName?.toLowerCase();
    if (tagName === "h2") {
      break;
    }

    if (current.is("table")) {
      const table = current.get(0);
      if (table) {
        tables.push(table);
      }
    } else {
      tables.push(...current.find("table").toArray());
    }

    current = current.next();
  }

  return tables;
}

function shouldIncludeOpenAITextModel(model: string): boolean {
  const normalized = model.toLowerCase();
  return !normalized.includes("image") && !normalized.includes("audio");
}

function parseUsdPrice(raw: string | undefined): number {
  const normalized = raw?.trim();
  if (!normalized || normalized === "-" || normalized === "/") {
    return Number.NaN;
  }

  return parseUsdAmount(normalized);
}

export function getOpenAIManualFallback(): PricingModel[] {
  const source = OPENAI_PRICING_URL;
  return [
    {
      provider: "openai",
      model: "gpt-4.1",
      type: "text",
      input_price_per_million: 2,
      output_price_per_million: 8,
      currency: "USD",
      source
    },
    {
      provider: "openai",
      model: "gpt-4.1-mini",
      type: "text",
      input_price_per_million: 0.4,
      output_price_per_million: 1.6,
      currency: "USD",
      source
    },
    {
      provider: "openai",
      model: "gpt-4o",
      type: "text",
      input_price_per_million: 2.5,
      output_price_per_million: 10,
      currency: "USD",
      source
    },
    {
      provider: "openai",
      model: "gpt-4o-mini",
      type: "text",
      input_price_per_million: 0.15,
      output_price_per_million: 0.6,
      currency: "USD",
      source
    }
  ];
}
