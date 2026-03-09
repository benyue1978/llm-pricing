import { expect } from "vitest";
import type { PricingModel } from "../../src/schema.js";

export function assertValidPricingModels(models: unknown): asserts models is PricingModel[] {
  expect(Array.isArray(models)).toBe(true);

  const arr = models as PricingModel[];
  expect(arr.length).toBeGreaterThan(0);

  for (const model of arr) {
    expect(typeof model.provider).toBe("string");
    expect(model.provider).not.toBe("");

    expect(typeof model.model).toBe("string");
    expect(model.model).not.toBe("");

    expect(typeof model.type).toBe("string");
    expect(model.type).not.toBe("");

    expect(typeof model.input_price_per_million).toBe("number");
    expect(Number.isFinite(model.input_price_per_million)).toBe(true);
    expect(model.input_price_per_million).toBeGreaterThanOrEqual(0);

    if (model.output_price_per_million !== null) {
      expect(typeof model.output_price_per_million).toBe("number");
      expect(Number.isFinite(model.output_price_per_million)).toBe(true);
      expect(model.output_price_per_million).toBeGreaterThanOrEqual(0);
    }

    expect(typeof model.currency).toBe("string");
    expect(model.currency).not.toBe("");

    expect(typeof model.source).toBe("string");
    expect(model.source).not.toBe("");
  }
}
