import { describe, expect, test, vi } from "vitest";
import { mkdtemp, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BenchmarkRegistry, CurrencyRateRegistry, PricingModel, ProviderOpsStatus } from "../../src/schema.js";
import { runUpdate } from "../../src/cli/index.js";

describe("cli runUpdate", () => {
  test("writes all generated registries with pricing, ops, fx, metadata, and benchmark artifacts", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "llm-pricing-cli-"));
    await mkdir(join(cwd, "data"), { recursive: true });

    const models: PricingModel[] = [
      {
        provider: "test-provider",
        model: "test-model",
        type: "text",
        input_price_per_million: 1,
        output_price_per_million: 2,
        currency: "USD",
        source: "https://example.com"
      }
    ];
    const providerStatuses: ProviderOpsStatus[] = [
      {
        provider: "test-provider",
        success: true,
        mode: "live",
        model_count: 1,
        started_at: "2026-03-10T00:00:00.000Z",
        finished_at: "2026-03-10T00:00:01.000Z",
        checked_at: "2026-03-10T00:00:01.000Z",
        duration_ms: 1000,
        message: "live official pricing page (1 models)",
        messages: ["live official pricing page (1 models)"],
        fail_reason: null
      }
    ];
    const currencyRateRegistry: CurrencyRateRegistry = {
      updated_at: "2026-03-10T00:00:00.000Z",
      source: "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml",
      base_currency: "EUR",
      rates: {
        EUR: 1,
        USD: 1.1555,
        CNY: 8.2881
      }
    };
    const benchmarkRegistry: BenchmarkRegistry = {
      updated_at: "2026-03-10T00:00:00.000Z",
      sources: [],
      benchmarks: [
        {
          id: "livebench_overall",
          name: "LiveBench Overall",
          category: "general",
          maintainer: "LiveBench",
          metric_name: "mean task score",
          score_direction: "higher_is_better",
          source_url: "https://livebench.ai/",
          docs_url: "https://github.com/LiveBench/LiveBench",
          applicable_modalities: ["text"],
          suitable_for_normalized_price: true,
          notes: "Test benchmark."
        }
      ],
      results: []
    };

    const logger = vi.fn();

    const result = await runUpdate({
      cwd,
      logger,
      fetchAllDetailed: async (log) => {
        expect(log).toBe(logger);
        return {
          models,
          providerStatuses
        };
      },
      fetchCurrencyRates: async () => currencyRateRegistry,
      fetchBenchmarks: async () => benchmarkRegistry
    });

    const jsonPath = join(cwd, "data/pricing.json");
    const opsPath = join(cwd, "data/ops.json");
    const currencyRatePath = join(cwd, "data/currency_rate.json");
    const modelCatalogPath = join(cwd, "data/models.json");
    const benchmarkPath = join(cwd, "data/benchmarks.json");
    const raw = await readFile(jsonPath, "utf8");
    const opsRaw = await readFile(opsPath, "utf8");
    const currencyRateRaw = await readFile(currencyRatePath, "utf8");
    const modelCatalogRaw = await readFile(modelCatalogPath, "utf8");
    const benchmarkRaw = await readFile(benchmarkPath, "utf8");
    const parsed = JSON.parse(raw);
    const opsParsed = JSON.parse(opsRaw);
    const currencyRateParsed = JSON.parse(currencyRateRaw);
    const modelCatalogParsed = JSON.parse(modelCatalogRaw);
    const benchmarkParsed = JSON.parse(benchmarkRaw);

    expect(parsed.models).toEqual(models);
    expect(typeof parsed.updated_at).toBe("string");
    expect(new Date(parsed.updated_at).getTime()).toBeGreaterThan(0);
    expect(opsParsed.providers).toEqual(providerStatuses);
    expect(opsParsed.summary).toMatchObject({
      provider_count: 1,
      success_count: 1,
      failure_count: 0,
      live_count: 1,
      fallback_count: 0,
      model_count: 1
    });
    expect(currencyRateParsed).toEqual(currencyRateRegistry);
    expect(modelCatalogParsed.updated_at).toEqual(parsed.updated_at);
    expect(modelCatalogParsed.models).toHaveLength(1);
    expect(modelCatalogParsed.models[0]).toMatchObject({
      provider: "test-provider",
      model: "test-model",
      access_type: "api",
      openness: "closed"
    });
    expect(benchmarkParsed).toEqual(benchmarkRegistry);

    expect(result.registry.models).toEqual(models);
    expect(result.opsRegistry.providers).toEqual(providerStatuses);
    expect(result.currencyRateRegistry).toEqual(currencyRateRegistry);
    expect(result.modelCatalogRegistry.models).toHaveLength(1);
    expect(result.benchmarkRegistry).toEqual(benchmarkRegistry);
    expect(result.outputPath).toBe(jsonPath);
    expect(result.opsOutputPath).toBe(opsPath);
    expect(result.currencyRateOutputPath).toBe(currencyRatePath);
    expect(result.modelCatalogOutputPath).toBe(modelCatalogPath);
    expect(result.benchmarkOutputPath).toBe(benchmarkPath);
  });
});
