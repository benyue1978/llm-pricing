import { describe, expect, test } from "vitest";
import { buildModelCatalogEntry, buildModelCatalogRegistry, inferComparisonBuckets, inferModelFamily } from "../../src/catalog.js";
import { buildBenchmarkAliases, mapBenchmarkRows, parseLiveBenchCsv, parseLiveCodeBenchData, parseSweBenchHtml } from "../../src/benchmarks.js";
import type { PricingModel } from "../../src/schema.js";

describe("catalog", () => {
  const sampleModel: PricingModel = {
    provider: "openai",
    model: "gpt-4.1-mini",
    type: "text",
    input_price_per_million: 0.4,
    output_price_per_million: 1.6,
    currency: "USD",
    source: "https://platform.openai.com/pricing"
  };

  test("inferModelFamily normalizes known model families", () => {
    expect(inferModelFamily("gpt-4.1-mini")).toBe("gpt-4.1");
    expect(inferModelFamily("claude-3-5-sonnet")).toBe("claude-3.5");
    expect(inferModelFamily("kimi-k2-thinking")).toBe("kimi-k2");
  });

  test("inferComparisonBuckets groups models into comparison buckets", () => {
    expect(inferComparisonBuckets("gpt-4.1-mini", "text")).toEqual(["low-cost", "text-models"]);
    expect(inferComparisonBuckets("kimi-k2-thinking", "text")).toContain("reasoning");
    expect(inferComparisonBuckets("codestral-latest", "text")).toContain("coding");
    expect(inferComparisonBuckets("gpt-5.1-codex", "text")).toEqual(["agentic-coding", "coding", "frontier", "general-purpose", "text-models"]);
    expect(inferComparisonBuckets("moonshot-v1-128k", "text")).toContain("long-context");
  });

  test("buildModelCatalogEntry creates metadata entry with source-backed defaults", () => {
    const entry = buildModelCatalogEntry(sampleModel);

    expect(entry).toMatchObject({
      provider: "openai",
      model: "gpt-4.1-mini",
      family: "gpt-4.1",
      access_type: "api",
      openness: "closed",
      model_page_url: "https://platform.openai.com/docs/models"
    });
    expect(entry.metadata_source_ids).toContain("openai-models-docs");
    expect(entry.benchmark_ids).toContain("livebench_overall");
  });

  test("buildModelCatalogRegistry returns stable metadata artifact", () => {
    const updatedAt = "2026-03-10T00:00:00.000Z";
    const modelCatalog = buildModelCatalogRegistry(updatedAt, [sampleModel]);

    expect(modelCatalog.updated_at).toBe(updatedAt);
    expect(modelCatalog.models).toHaveLength(1);
    expect(modelCatalog.sources.length).toBeGreaterThanOrEqual(5);
  });

  test("buildBenchmarkAliases stays explicit instead of matching whole families", () => {
    expect(buildBenchmarkAliases({
      ...sampleModel,
      model: "gpt-5"
    })).toEqual([]);
    expect(buildBenchmarkAliases({
      ...sampleModel,
      model: "gpt-5.1-codex"
    })).toEqual(["gpt-5.1-codex"]);
  });

  test("mapBenchmarkRows only matches explicit aliases", () => {
    const matches = mapBenchmarkRows(
      [
        {
          ...sampleModel,
          model: "gpt-5"
        },
        {
          ...sampleModel,
          model: "gpt-5.1-codex"
        }
      ],
      [
        {
          benchmarkId: "livebench_overall",
          benchmarkModel: "gpt-5.1-codex",
          score: 81,
          evaluatedAt: "2026-01-08",
          sourceUrl: "https://livebench.ai/table_2026_01_08.csv"
        },
        {
          benchmarkId: "livebench_overall",
          benchmarkModel: "gpt-5.1-codex-max",
          score: 82,
          evaluatedAt: "2026-01-08",
          sourceUrl: "https://livebench.ai/table_2026_01_08.csv"
        }
      ]
    );

    expect(matches).toEqual([
      {
        provider: "openai",
        model: "gpt-5.1-codex",
        benchmark_id: "livebench_overall",
        score: 81,
        score_unit: "points",
        evaluated_at: "2026-01-08",
        source_url: "https://livebench.ai/table_2026_01_08.csv",
        benchmark_model: "gpt-5.1-codex",
        matched_benchmark_models: ["gpt-5.1-codex"],
        notes: null
      }
    ]);
  });

  test("benchmark parsers extract official-source scores", () => {
    const liveBenchRows = parseLiveBenchCsv(
      "model,code_generation,code_completion,javascript,typescript\n" +
      "gpt-5.1-codex,90,80,70,60\n",
      { Coding: ["code_generation", "code_completion"], "Agentic Coding": ["javascript", "typescript"] }
    );
    const liveCodeRows = parseLiveCodeBenchData({
      performances: [
        { model: "GPT-4O-mini-2024-07-18", date: 1, difficulty: "easy", "pass@1": 40 },
        { model: "GPT-4O-mini-2024-07-18", date: 2, difficulty: "hard", "pass@1": 60 }
      ],
      models: [{ model_repr: "GPT-4O-mini-2024-07-18", release_date: "2024-07-18", link: "https://example.com" }]
    });
    const sweRows = parseSweBenchHtml(
      '<script type="application/json" id="leaderboard-data">[{"name":"bash-only","results":[{"name":"GPT-4.1 (2025-04-14)","resolved":39.58,"date":"2025-07-26","site":"https://platform.openai.com/docs/models/gpt-4.1"}]}]</script>'
    );

    expect(liveBenchRows[0]).toMatchObject({
      benchmarkModel: "gpt-5.1-codex",
      scores: {
        livebench_coding: 85,
        livebench_agentic_coding: 65
      }
    });
    expect(liveCodeRows[0]).toMatchObject({
      benchmarkModel: "GPT-4O-mini-2024-07-18",
      score: 50
    });
    expect(sweRows[0]).toMatchObject({
      benchmarkModel: "GPT-4.1 (2025-04-14)",
      score: 39.58
    });
  });
});
