import { describe, expect, test, vi } from "vitest";
import { fetchAllProviders, providers } from "../../src/providers/index.js";

describe("providers/index", () => {
  test("fetchAllProviders aggregates results from all providers", async () => {
    const logger = vi.fn();
    const result = await fetchAllProviders(logger);
    expect(result.length).toBeGreaterThan(0);
    expect(logger).toHaveBeenCalled();
  });

  test("fetchAllProviders continues when a provider throws", async () => {
    const original = providers.openai;
    // @ts-expect-error test override
    providers.openai = async () => {
      throw new Error("boom");
    };

    try {
      const logger = vi.fn();
      const result = await fetchAllProviders(logger);
      // Other providers should still contribute data.
      expect(result.length).toBeGreaterThan(0);
      const hasNonOpenAI = result.some((m) => m.provider !== "openai");
      expect(hasNonOpenAI).toBe(true);
      const joinedLogs = logger.mock.calls.map((c) => c[0]).join("\n");
      expect(joinedLogs).toContain("Failed to fetch openai pricing");
    } finally {
      providers.openai = original;
    }
  });
});

