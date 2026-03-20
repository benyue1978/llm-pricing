import { test, expect } from "@playwright/test";

test.describe("LLM Pricing Dashboard", () => {
  test("renders pricing data and supports search, filtering, and sorting", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const [pricingResponse, currencyRateResponse, modelsResponse, benchmarksResponse] = await Promise.all([
      page.request.get("/data/pricing.json"),
      page.request.get("/data/currency_rate.json"),
      page.request.get("/data/models.json"),
      page.request.get("/data/benchmarks.json")
    ]);
    expect(pricingResponse.ok()).toBe(true);
    expect(currencyRateResponse.ok()).toBe(true);
    expect(modelsResponse.ok()).toBe(true);
    expect(benchmarksResponse.ok()).toBe(true);

    const json = await pricingResponse.json();
    const benchmarks = await benchmarksResponse.json();
    expect(Array.isArray(json.models)).toBe(true);
    expect(json.models.length).toBeGreaterThan(0);
    expect(Array.isArray(benchmarks.results)).toBe(true);
    expect(benchmarks.results.length).toBeGreaterThan(0);

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

    const firstPriceBefore = await page.locator('tbody tr td[data-label="Input"]').first().textContent();
    await page.locator("#currency-filter").selectOption("CNY");
    const firstPriceAfter = await page.locator('tbody tr td[data-label="Input"]').first().textContent();
    expect(firstPriceAfter).toContain("CNY");
    expect(firstPriceAfter).not.toBe(firstPriceBefore);

    await page.locator("#sort-field").selectOption("input_price_per_million");
    await page.getByRole("button", { name: "Sort: ascending" }).click();

    const inputPrices = await page.locator('tbody tr td[data-label="Input"]').allTextContents();
    expect(inputPrices.length).toBeGreaterThan(1);
    expect(inputPrices[0]).not.toBe(inputPrices[inputPrices.length - 1]);

    await page.locator("#reset-filters").click();
    await page.locator("#comparison-view").selectOption("livebench_overall");
    await expect(page.locator("thead")).toContainText("Score");
    await expect(page.locator("#benchmark-panel")).toBeVisible();
    await expect(page.locator("#benchmark-panel")).toContainText("LiveBench Overall");
    await expect(page.locator("#benchmark-source-link")).toHaveAttribute("href", /livebench\.ai/);
    const scoreTexts = await page.locator("tbody tr td").allTextContents();
    expect(scoreTexts.some((text) => /\d/.test(text))).toBe(true);

    await page.locator("#sort-field").selectOption("input_price_per_score");
    const efficiencyCell = await page.locator('tbody tr td[data-label="Input / score"]').first().textContent();
    expect(efficiencyCell).toContain("/ pt");

    await page.getByRole("button", { name: /Coding value/i }).click();
    await expect(page.locator("#comparison-view")).toHaveValue("livebench_coding");
    await expect(page.locator("#bucket-filter")).toHaveValue("all");
    await expect(page.locator("#sort-field")).toHaveValue("input_price_per_score");
    await expect(page.locator(".preset-card.is-active")).toContainText("Coding value");
    await expect(page).toHaveURL(/view=livebench_coding/);
    await expect(page).toHaveURL(/sort=input_price_per_score/);

    const statefulUrl = page.url();
    await page.goto(statefulUrl);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#comparison-view")).toHaveValue("livebench_coding");
    await expect(page.locator("#sort-field")).toHaveValue("input_price_per_score");

    const traceableRow = page.locator("tbody tr").filter({
      has: page.locator("td[data-label='Score'] a", { hasText: "Trace" })
    }).first();
    const traceableModel = (await traceableRow.locator("td[data-label='Model'] a").textContent())?.trim();
    expect(traceableModel).toBeTruthy();

    await page.locator("#search-input").fill(traceableModel ?? "");
    await expect.poll(() => page.url()).toContain(`q=${encodeURIComponent(traceableModel ?? "")}`);

    const modelLink = page.locator("tbody tr td[data-label='Model'] a").first();
    await expect(modelLink).toHaveText(traceableModel ?? "");
    const detailHref = await modelLink.getAttribute("href");
    expect(detailHref).toContain("/model.html#");
    const traceHref = await page.locator("tbody tr td[data-label='Score'] a", { hasText: "Trace" }).first().getAttribute("href");
    expect(traceHref).toContain("section=benchmark-trace");
    await page.locator("tbody tr td[data-label='Score'] a", { hasText: "Trace" }).first().click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#benchmark-trace")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Where each score comes from" })).toBeVisible();
    await expect(page.locator("#benchmark-cards")).toContainText("Methodology");
    await expect(page.locator("#source-grid")).toContainText("Open pricing source");
    await expect(page.locator("#source-grid .detail-url")).toHaveCount(2);
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
