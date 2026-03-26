import { defineConfig, devices } from "@playwright/test";

const loopbackNoProxy = "127.0.0.1,localhost";
process.env.NO_PROXY = process.env.NO_PROXY
  ? `${process.env.NO_PROXY},${loopbackNoProxy}`
  : loopbackNoProxy;
process.env.no_proxy = process.env.no_proxy
  ? `${process.env.no_proxy},${loopbackNoProxy}`
  : loopbackNoProxy;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run web:dev",
    url: "http://127.0.0.1:4173/",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
