import { load } from "cheerio";
import { fetchHtml } from "./providers/utils.js";
import type { CurrencyRateRegistry } from "./schema.js";

export const ECB_FX_SOURCE = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

export async function fetchCurrencyRateRegistry(): Promise<CurrencyRateRegistry> {
  const xml = await fetchHtml(ECB_FX_SOURCE, {
    validateHtml: (candidate) => {
      const parsed = parseEcbDailyRatesXml(candidate);
      return parsed.updated_at.length > 0 && Object.keys(parsed.rates).length >= 2;
    }
  });

  return parseEcbDailyRatesXml(xml);
}

export function parseEcbDailyRatesXml(xml: string): CurrencyRateRegistry {
  const $ = load(xml, { xmlMode: true });
  const dayCube = $("Cube[time]").first();
  const updatedAt = dayCube.attr("time")?.trim();
  if (!updatedAt) {
    return {
      updated_at: "",
      source: ECB_FX_SOURCE,
      base_currency: "EUR",
      rates: {}
    };
  }

  const rates: Record<string, number> = {};
  dayCube.find("Cube[currency][rate]").each((_, cube) => {
    const currency = $(cube).attr("currency")?.trim();
    const rate = Number.parseFloat($(cube).attr("rate") ?? "");
    if (!currency || !Number.isFinite(rate)) {
      return;
    }

    rates[currency] = rate;
  });

  rates.EUR = 1;

  return {
    updated_at: `${updatedAt}T00:00:00.000Z`,
    source: ECB_FX_SOURCE,
    base_currency: "EUR",
    rates
  };
}

export function convertCurrency(
  amount: number | null,
  fromCurrency: string,
  toCurrency: string,
  registry: CurrencyRateRegistry | null
): number | null {
  if (amount == null) {
    return null;
  }

  if (fromCurrency === toCurrency) {
    return amount;
  }

  const fromRate = registry?.rates[fromCurrency];
  const toRate = registry?.rates[toCurrency];
  if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || !fromRate || !toRate) {
    return null;
  }

  const amountInBase = amount / fromRate;
  const converted = amountInBase * toRate;
  return Number.isFinite(converted) ? converted : null;
}
