import { describe, expect, test, vi } from "vitest";
import { fetchAllProviders, providers } from "../../src/providers/index.js";

describe("providers/index", () => {
  test("fetchAllProviders aggregates results from all providers", async () => {
    const originalProviders = { ...providers };
    for (const providerId of Object.keys(providers)) {
      providers[providerId] = async () => [
        {
          provider: providerId,
          model: `${providerId}-model`,
          type: "text",
          input_price_per_million: 1,
          output_price_per_million: 2,
          currency: "USD",
          source: `https://example.com/${providerId}`
        }
      ];
    }

    try {
      const logger = vi.fn();
      const result = await fetchAllProviders(logger);
      expect(result).toHaveLength(Object.keys(providers).length);
      expect(logger).toHaveBeenCalled();
    } finally {
      Object.assign(providers, originalProviders);
    }
  });

  test("fetchAllProviders continues when a provider throws", async () => {
    const originalProviders = { ...providers };
    providers.openai = async () => {
      throw new Error("boom");
    };
    for (const providerId of Object.keys(providers)) {
      if (providerId === "openai") {
        continue;
      }
      providers[providerId] = async () => [
        {
          provider: providerId,
          model: `${providerId}-model`,
          type: "text",
          input_price_per_million: 1,
          output_price_per_million: 2,
          currency: "USD",
          source: `https://example.com/${providerId}`
        }
      ];
    }

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
      Object.assign(providers, originalProviders);
    }
  });
});
