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
