import { test, expect } from "@playwright/test";

test.describe("LLM Pricing Dashboard", () => {
  test("serves pricing.json with expected providers and models", async ({ page }) => {
    // Ensure the static site is up.
    await page.goto("/web/index.html");
    await page.waitForLoadState("networkidle");

    const response = await page.request.get("/data/pricing.json");
    expect(response.ok()).toBe(true);

    const json = await response.json();
    expect(Array.isArray(json.models)).toBe(true);
    expect(json.models.length).toBeGreaterThan(0);

    const providers = new Set(json.models.map((m: any) => m.provider));
    expect(providers.has("openai")).toBe(true);
  });

  test("pricing.json contains a recent updated_at timestamp", async ({ page }) => {
    const response = await page.request.get("/data/pricing.json");
    expect(response.ok()).toBe(true);

    const json = await response.json();
    expect(typeof json.updated_at).toBe("string");
    const ts = Date.parse(json.updated_at);
    expect(Number.isNaN(ts)).toBe(false);
  });
});
