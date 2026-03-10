import { describe, expect, test, vi } from "vitest";
import { fetchAllProviders, fetchAllProvidersDetailed, providers } from "../../src/providers/index.js";

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

  test("fetchAllProvidersDetailed captures provider status metadata", async () => {
    const originalProviders = { ...providers };
    for (const providerId of Object.keys(providers)) {
      providers[providerId] = async (logger) => {
        const mode = providerId === "google" ? "fallback" : "live";
        logger?.(`${mode} official pricing page (1 models)`);
        return [
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
      };
    }

    try {
      const result = await fetchAllProvidersDetailed(vi.fn());
      const openai = result.providerStatuses.find((entry) => entry.provider === "openai");
      const google = result.providerStatuses.find((entry) => entry.provider === "google");

      expect(result.models).toHaveLength(Object.keys(providers).length);
      expect(result.providerStatuses).toHaveLength(Object.keys(providers).length);
      expect(openai).toMatchObject({
        success: true,
        mode: "live",
        model_count: 1,
        fail_reason: null
      });
      expect(google).toMatchObject({
        success: true,
        mode: "fallback",
        model_count: 1,
        fail_reason: null
      });
    } finally {
      Object.assign(providers, originalProviders);
    }
  });
});
