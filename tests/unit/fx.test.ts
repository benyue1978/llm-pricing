import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  ECB_FX_SOURCE,
  convertCurrency,
  fetchCurrencyRateRegistry,
  parseEcbDailyRatesXml
} from "../../src/fx.js";

describe("fx", () => {
  test("parseEcbDailyRatesXml parses the ECB daily XML feed", async () => {
    const fixturePath = resolve(__dirname, "../fixtures/ecb-eurofxref-daily.xml");
    const xml = await readFile(fixturePath, "utf8");

    expect(parseEcbDailyRatesXml(xml)).toEqual({
      updated_at: "2026-03-09T00:00:00.000Z",
      source: ECB_FX_SOURCE,
      base_currency: "EUR",
      rates: {
        USD: 1.1555,
        CNY: 8.2881,
        EUR: 1
      }
    });
  });

  test("convertCurrency converts between USD and CNY through the ECB base currency", () => {
    const registry = {
      updated_at: "2026-03-09T00:00:00.000Z",
      source: ECB_FX_SOURCE,
      base_currency: "EUR",
      rates: {
        EUR: 1,
        USD: 1.1555,
        CNY: 8.2881
      }
    };

    expect(convertCurrency(1, "USD", "USD", registry)).toBe(1);
    expect(convertCurrency(1, "USD", "CNY", registry)).toBeCloseTo(7.1727, 4);
    expect(convertCurrency(7.1727, "CNY", "USD", registry)).toBeCloseTo(1, 3);
  });

  test("live ECB feed still contains USD and CNY rates", async () => {
    const registry = await fetchCurrencyRateRegistry();
    expect(registry.source).toBe(ECB_FX_SOURCE);
    expect(typeof registry.updated_at).toBe("string");
    expect(registry.rates.USD).toBeGreaterThan(0);
    expect(registry.rates.CNY).toBeGreaterThan(0);
  }, 30000);
});
