import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fetch } from "undici";

const execFileAsync = promisify(execFile);
const DEFAULT_USER_AGENT = "Mozilla/5.0";

export interface FetchHtmlOptions {
  validateHtml?: (html: string) => boolean;
}

export interface FetchJsonOptions<T> {
  validateJson?: (data: T) => boolean;
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

export function parseUsdAmount(raw: string | undefined): number {
  if (!raw) {
    return Number.NaN;
  }

  const match = raw.replace(/,/g, "").match(/\$([0-9]+(?:\.[0-9]+)?)/);
  if (!match) {
    return Number.NaN;
  }

  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) ? value : Number.NaN;
}

export function parseCnyAmount(raw: string | undefined): number {
  if (!raw) {
    return Number.NaN;
  }

  const match = raw.replace(/,/g, "").match(/[¥￥]\s*([0-9]+(?:\.[0-9]+)?)/);
  if (!match) {
    return Number.NaN;
  }

  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) ? value : Number.NaN;
}
