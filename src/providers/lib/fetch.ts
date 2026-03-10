import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fetch } from "undici";
import type { PricingModel } from "../../schema.js";
import type { ProviderLogger } from "../types.js";

const execFileAsync = promisify(execFile);
const DEFAULT_USER_AGENT = "Mozilla/5.0";

export interface FetchHtmlOptions {
  validateHtml?: (html: string) => boolean;
}

export interface FetchJsonOptions<T> {
  validateJson?: (data: T) => boolean;
}

export interface FetchProviderPricingOptions {
  fetchLive: () => Promise<PricingModel[]>;
  getFallback: () => PricingModel[];
  logger?: ProviderLogger;
  describeLive?: (models: PricingModel[]) => string;
  describeFallback?: (models: PricingModel[]) => string;
}

export async function fetchProviderPricing({
  fetchLive,
  getFallback,
  logger = () => {},
  describeLive = (models) => `live official pricing page (${models.length} models)`,
  describeFallback = (models) => `fallback manual values (${models.length} models)`
}: FetchProviderPricingOptions): Promise<PricingModel[]> {
  try {
    const liveModels = await fetchLive();
    if (liveModels.length > 0) {
      logger(describeLive(liveModels));
      return liveModels;
    }
  } catch {
    // Fall through to the manual fallback.
  }

  const fallbackModels = getFallback();
  logger(describeFallback(fallbackModels));
  return fallbackModels;
}

export async function fetchHtml(url: string, options: FetchHtmlOptions = {}): Promise<string> {
  const validateHtml = options.validateHtml ?? (() => true);

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": DEFAULT_USER_AGENT,
        accept: "text/html,application/xhtml+xml"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    if (html.trim() && validateHtml(html)) {
      return html;
    }
  } catch {
    // Fall back to curl for sites that block or timeout plain Node fetches.
  }

  const outputPath = join(tmpdir(), `llm-pricing-${randomUUID()}.html`);
  try {
    await execFileAsync("/usr/bin/curl", [
      "--http1.1",
      "-L",
      "--fail",
      "--silent",
      "--show-error",
      "--retry",
      "3",
      "--retry-all-errors",
      "-A",
      DEFAULT_USER_AGENT,
      "-o",
      outputPath,
      url
    ]);
    const stdout = await readFile(outputPath, "utf8");

    if (stdout.trim() && validateHtml(stdout)) {
      return stdout;
    }

    return stdout;
  } finally {
    await rm(outputPath, { force: true });
  }
}

export async function fetchJson<T>(url: string, options: FetchJsonOptions<T> = {}): Promise<T> {
  const validateJson = options.validateJson ?? (() => true);

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": DEFAULT_USER_AGENT,
        accept: "application/json,text/plain"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as T;
    if (validateJson(data)) {
      return data;
    }
  } catch {
    // Fall back to curl for sites that block or timeout plain Node fetches.
  }

  const outputPath = join(tmpdir(), `llm-pricing-${randomUUID()}.json`);
  try {
    await execFileAsync("/usr/bin/curl", [
      "--http1.1",
      "-L",
      "--fail",
      "--silent",
      "--show-error",
      "--retry",
      "3",
      "--retry-all-errors",
      "-A",
      DEFAULT_USER_AGENT,
      "-H",
      "Accept: application/json,text/plain",
      "-o",
      outputPath,
      url
    ]);
    const raw = await readFile(outputPath, "utf8");
    const data = JSON.parse(raw) as T;

    if (validateJson(data)) {
      return data;
    }

    return data;
  } finally {
    await rm(outputPath, { force: true });
  }
}

export async function fetchRenderedHtml(
  url: string,
  options: FetchHtmlOptions = {}
): Promise<string> {
  const validateHtml = options.validateHtml ?? (() => true);
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      userAgent: DEFAULT_USER_AGENT
    });
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    const html = await page.content();

    if (html.trim() && validateHtml(html)) {
      return html;
    }

    return html;
  } finally {
    await browser.close();
  }
}
