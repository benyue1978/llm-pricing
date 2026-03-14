import { load } from "cheerio";
import type { AnyNode } from "domhandler";
import type { PricingModel } from "../schema.js";
import {
  createTextPricingModel,
  fetchHtml,
  parseUsdAmount,
  normalizeText
} from "./utils.js";
import type { ProviderLogger } from "./types.js";

const OPENAI_PRICING_URL = "https://platform.openai.com/pricing";
const OPENAI_PRICING_DOCS_URL = "https://developers.openai.com/api/docs/pricing";
const OPENAI_TEXT_SWITCHER_ID = "latest-pricing";

export async function fetchOpenAIPricing(logger: ProviderLogger = () => {}): Promise<PricingModel[]> {
  for (const url of [OPENAI_PRICING_DOCS_URL, OPENAI_PRICING_URL]) {
    try {
      const html = await fetchHtml(url, {
        validateHtml: (candidate) => parseOpenAIHtml(candidate).length > 0
      });
      const parsed = parseOpenAIHtml(html);
      if (parsed.length > 0) {
        logger(`live ${url} (${parsed.length} models)`);
        return parsed;
      }
    } catch {
      // Try the next official endpoint before falling back to manual values.
    }
  }

  logger(`fallback manual values (${getOpenAIManualFallback().length} models)`);
  return getOpenAIManualFallback();
}

export function parseOpenAIHtml(html: string): PricingModel[] {
  const $ = load(html);
  const models = new Map<string, PricingModel>();

  for (const model of parseOpenAIAstroRows($)) {
    if (!models.has(model.model)) {
      models.set(model.model, model);
    }
  }

  const paneSelector =
    `[data-content-switcher-root][data-content-switcher-id="${OPENAI_TEXT_SWITCHER_ID}"] ` +
    `[data-content-switcher-pane][data-value="standard"]`;
  const tableCandidates: AnyNode[] = [
    ...$(paneSelector).find("table").toArray(),
    ...findTextTokenTables($)
  ];

  for (const table of tableCandidates) {
    $(table)
      .find("tbody tr")
      .each((_, row) => {
        const parsed = parseOpenAIRowCells($(row)
          .find("td")
          .toArray()
          .map((cell) => normalizeText($(cell).text())));

        if (!parsed || models.has(parsed.model)) {
          return;
        }

        models.set(parsed.model, createTextPricingModel({
          provider: "openai",
          model: parsed.model,
          input: parsed.input,
          output: parsed.output,
          currency: "USD",
          source: OPENAI_PRICING_URL
        }));
      });
  }

  return [...models.values()];
}

function parseOpenAIRowCells(cells: string[]): {
  model: string,
  input: number,
  output: number | null,
} | null {
  const [rawModel, inputRaw, _cachedInputRaw, outputRaw] = cells;
  const model = normalizeOpenAIModelName(rawModel);
  if (!model || !shouldIncludeOpenAITextModel(model)) {
    return null;
  }

  const input = parseUsdPrice(inputRaw);
  const output = parseUsdPrice(outputRaw);
  if (!Number.isFinite(input)) {
    return null;
  }

  return {
    model,
    input,
    output: Number.isFinite(output) ? output : null
  };
}

function parseOpenAIAstroRows($: ReturnType<typeof load>): PricingModel[] {
  const paneSelector =
    `[data-content-switcher-root][data-content-switcher-id="${OPENAI_TEXT_SWITCHER_ID}"] ` +
    `[data-content-switcher-pane][data-value="standard"]`;

  return $(paneSelector)
    .find('astro-island[component-export="TextTokenPricingTables"]')
    .toArray()
    .flatMap((island) => {
      const propsRaw = $(island).attr("props");
      if (!propsRaw) {
        return [];
      }

      const rows = parseOpenAIAstroRowsProp(propsRaw);
      return rows.flatMap((cells) => {
        const parsed = parseOpenAIRowCells(cells);
        if (!parsed) {
          return [];
        }

        return [createTextPricingModel({
          provider: "openai",
          model: parsed.model,
          input: parsed.input,
          output: parsed.output,
          currency: "USD",
          source: OPENAI_PRICING_URL
        })];
      });
    });
}

function parseOpenAIAstroRowsProp(raw: string): string[][] {
  try {
    const decoded = decodeAstroValue(JSON.parse(raw)) as {
      rows?: unknown
    };
    if (!Array.isArray(decoded.rows)) {
      return [];
    }

    return decoded.rows
      .filter((row): row is unknown[] => Array.isArray(row))
      .map((row) => row.map((cell) => normalizeText(String(cell ?? ""))));
  } catch {
    return [];
  }
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

function decodeAstroValue(value: unknown): unknown {
  if (!Array.isArray(value) || value.length !== 2 || typeof value[0] !== "number") {
    if (Array.isArray(value)) {
      return value.map((entry) => decodeAstroValue(entry));
    }

    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, decodeAstroValue(entry)])
      );
    }

    return value;
  }

  const [type, payload] = value;
  switch (type) {
    case 0:
      return payload;
    case 1:
      return Array.isArray(payload) ? payload.map((entry) => decodeAstroValue(entry)) : payload;
    default:
      return payload;
  }
}

function shouldIncludeOpenAITextModel(model: string): boolean {
  const normalized = model.toLowerCase();
  return !normalized.includes("image") && !normalized.includes("audio");
}

function normalizeOpenAIModelName(model: string | undefined): string {
  return normalizeText(model ?? "").replace(/\s+\([^)]*\)$/, "");
}

function parseUsdPrice(raw: string | undefined): number {
  const normalized = raw?.trim();
  if (!normalized || normalized === "-" || normalized === "/") {
    return Number.NaN;
  }

  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    return Number.parseFloat(normalized);
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
