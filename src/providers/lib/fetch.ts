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

function getCurlRetryArgs(timeoutMs: number | undefined): string[] {
  if (timeoutMs !== undefined) {
    return [];
  }

  return [
    "--retry",
    "3",
    "--retry-all-errors"
  ];
}

function getCurlTimeoutArgs(timeoutMs: number | undefined): string[] {
  return timeoutMs === undefined ? [] : ["--max-time", (timeoutMs / 1000).toString()];
}

export interface FetchHtmlOptions {
  validateHtml?: (html: string) => boolean;
  timeoutMs?: number;
}

export interface FetchTextOptions {
  accept?: string;
  validateText?: (text: string) => boolean;
  timeoutMs?: number;
}

export interface FetchJsonOptions<T> {
  validateJson?: (data: T) => boolean;
  timeoutMs?: number;
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
  return fetchText(url, {
    accept: "text/html,application/xhtml+xml",
    validateText: options.validateHtml,
    timeoutMs: options.timeoutMs
  });
}

export function ensureValidatedText(
  text: string,
  validateText: (text: string) => boolean
): string {
  if (!text.trim()) {
    throw new Error("Fetched text was empty");
  }

  if (!validateText(text)) {
    throw new Error("Fetched text did not pass validation");
  }

  return text;
}

export function ensureValidatedJson<T>(
  data: T,
  validateJson: (data: T) => boolean
): T {
  if (!validateJson(data)) {
    throw new Error("Fetched JSON did not pass validation");
  }

  return data;
}

export async function fetchText(url: string, options: FetchTextOptions = {}): Promise<string> {
  const accept = options.accept ?? "text/plain,*/*";
  const validateText = options.validateText ?? (() => true);
  const timeoutMs = options.timeoutMs;

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": DEFAULT_USER_AGENT,
        accept
      },
      signal: timeoutMs === undefined ? undefined : AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return ensureValidatedText(await response.text(), validateText);
  } catch {
    // Fall back to curl for sites that block or timeout plain Node fetches.
  }

  const outputPath = join(tmpdir(), `llm-pricing-${randomUUID()}.txt`);
  try {
    await execFileAsync("/usr/bin/curl", [
      "--http1.1",
      "-L",
      "--fail",
      "--silent",
      "--show-error",
      ...getCurlRetryArgs(timeoutMs),
      ...getCurlTimeoutArgs(timeoutMs),
      "-A",
      DEFAULT_USER_AGENT,
      "-H",
      `Accept: ${accept}`,
      "-o",
      outputPath,
      url
    ]);
    return ensureValidatedText(await readFile(outputPath, "utf8"), validateText);
  } finally {
    await rm(outputPath, { force: true });
  }
}

export async function fetchJson<T>(url: string, options: FetchJsonOptions<T> = {}): Promise<T> {
  const validateJson = options.validateJson ?? (() => true);
  const timeoutMs = options.timeoutMs;

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": DEFAULT_USER_AGENT,
        accept: "application/json,text/plain"
      },
      signal: timeoutMs === undefined ? undefined : AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return ensureValidatedJson((await response.json()) as T, validateJson);
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
      ...getCurlRetryArgs(timeoutMs),
      ...getCurlTimeoutArgs(timeoutMs),
      "-A",
      DEFAULT_USER_AGENT,
      "-H",
      "Accept: application/json,text/plain",
      "-o",
      outputPath,
      url
    ]);
    return ensureValidatedJson(JSON.parse(await readFile(outputPath, "utf8")) as T, validateJson);
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
