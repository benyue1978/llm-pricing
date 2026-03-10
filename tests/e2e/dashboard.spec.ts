import { test, expect } from "@playwright/test";

test.describe("LLM Pricing Dashboard", () => {
  test("renders pricing data and supports search, filtering, and sorting", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const [pricingResponse, currencyRateResponse] = await Promise.all([
      page.request.get("/data/pricing.json"),
      page.request.get("/data/currency_rate.json")
    ]);
    expect(pricingResponse.ok()).toBe(true);
    expect(currencyRateResponse.ok()).toBe(true);

    const json = await pricingResponse.json();
    expect(Array.isArray(json.models)).toBe(true);
    expect(json.models.length).toBeGreaterThan(0);

    const providers = new Set(json.models.map((m: any) => m.provider));
    expect(providers.has("openai")).toBe(true);

    await expect(page.getByRole("heading", { name: "Aggregated model prices" })).toBeVisible();
    await expect(page.locator('#provider-filter option[value="openai"]')).toBeAttached();
    await page.locator("#provider-filter").selectOption("openai");

    const providerCells = page.locator("tbody tr td:first-child");
    const providerTexts = await providerCells.allTextContents();
    expect(providerTexts.length).toBeGreaterThan(0);
    expect(providerTexts.every((text) => text.trim().toLowerCase() === "openai")).toBe(true);

    await page.locator("#search-input").fill("gpt-4.1");
    const modelTexts = await page.locator("tbody tr td:nth-child(2)").allTextContents();
    expect(modelTexts.length).toBeGreaterThan(0);
    expect(modelTexts.every((text) => text.toLowerCase().includes("gpt-4.1"))).toBe(true);

    const firstPriceBefore = await page.locator("tbody tr td:nth-child(5)").first().textContent();
    await page.locator("#currency-filter").selectOption("CNY");
    const firstPriceAfter = await page.locator("tbody tr td:nth-child(5)").first().textContent();
    expect(firstPriceAfter).toContain("CNY");
    expect(firstPriceAfter).not.toBe(firstPriceBefore);

    await page.locator("#sort-field").selectOption("input_price_per_million");
    await page.getByRole("button", { name: "Sort: ascending" }).click();

    const inputPrices = await page.locator("tbody tr td:nth-child(5)").allTextContents();
    expect(inputPrices.length).toBeGreaterThan(1);
    expect(inputPrices[0]).not.toBe(inputPrices[inputPrices.length - 1]);
  });

  test("pricing.json contains a recent updated_at timestamp", async ({ page }) => {
    const response = await page.request.get("/data/pricing.json");
    expect(response.ok()).toBe(true);

    const json = await response.json();
    expect(typeof json.updated_at).toBe("string");
    const ts = Date.parse(json.updated_at);
    expect(Number.isNaN(ts)).toBe(false);
  });

  test("ops page renders provider status data from ops.json", async ({ page }) => {
    const response = await page.request.get("/data/ops.json");
    expect(response.ok()).toBe(true);

    const json = await response.json();
    expect(Array.isArray(json.providers)).toBe(true);
    expect(json.providers.length).toBeGreaterThan(0);

    await page.goto("/ops.html");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Provider execution status" })).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(json.providers.length);
  });
});
