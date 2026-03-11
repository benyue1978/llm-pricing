import { describe, expect, test } from "vitest";
import {
  createEmptyBenchmarkRegistry,
  createEmptyCurrencyRateRegistry,
  createEmptyModelCatalogRegistry,
  createEmptyOpsRegistry,
  createEmptyRegistry
} from "../../src/schema.js";

describe("schema", () => {
  test("createEmptyRegistry returns an empty registry with epoch timestamp", () => {
    const registry = createEmptyRegistry();
    expect(registry.models).toEqual([]);
    expect(registry.updated_at).toBe("1970-01-01T00:00:00.000Z");
  });

  test("createEmptyOpsRegistry returns an empty ops registry with epoch timestamp", () => {
    const registry = createEmptyOpsRegistry();
    expect(registry.providers).toEqual([]);
    expect(registry.updated_at).toBe("1970-01-01T00:00:00.000Z");
    expect(registry.summary).toMatchObject({
      provider_count: 0,
      success_count: 0,
      failure_count: 0,
      live_count: 0,
      fallback_count: 0,
      model_count: 0
    });
  });

  test("createEmptyCurrencyRateRegistry returns an empty fx registry with epoch timestamp", () => {
    const registry = createEmptyCurrencyRateRegistry();
    expect(registry.updated_at).toBe("1970-01-01T00:00:00.000Z");
    expect(registry.base_currency).toBe("EUR");
    expect(registry.rates).toEqual({});
  });

  test("createEmptyModelCatalogRegistry returns an empty metadata registry", () => {
    const registry = createEmptyModelCatalogRegistry();
    expect(registry.updated_at).toBe("1970-01-01T00:00:00.000Z");
    expect(registry.sources).toEqual([]);
    expect(registry.models).toEqual([]);
  });

  test("createEmptyBenchmarkRegistry returns an empty benchmark registry", () => {
    const registry = createEmptyBenchmarkRegistry();
    expect(registry.updated_at).toBe("1970-01-01T00:00:00.000Z");
    expect(registry.sources).toEqual([]);
    expect(registry.benchmarks).toEqual([]);
    expect(registry.results).toEqual([]);
  });
});
