import { defineConfig, devices } from "@playwright/test";

const loopbackNoProxy = "127.0.0.1,localhost";
const e2ePort = process.env.PLAYWRIGHT_TEST_PORT ?? "41731";
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;

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
    baseURL: e2eBaseUrl,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx serve . -l tcp://127.0.0.1:${e2ePort}`,
    url: `${e2eBaseUrl}/`,
    reuseExistingServer: false,
    timeout: 120000,
  },
});
