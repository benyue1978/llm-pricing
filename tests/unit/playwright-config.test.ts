import { describe, expect, test } from "vitest";

describe("playwright config", () => {
  test("uses a dedicated local server instead of reusing arbitrary listeners", async () => {
    const { default: config } = await import("../../playwright.config");

    expect(config.use?.baseURL).toBe("http://127.0.0.1:41731");
    expect(config.webServer?.url).toBe("http://127.0.0.1:41731/");
    expect(config.webServer?.reuseExistingServer).toBe(false);
    expect(config.webServer?.command).toContain("41731");
  });
});
