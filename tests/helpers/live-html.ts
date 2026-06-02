import {
  fetchHtml,
  fetchText,
  type FetchHtmlOptions,
  type FetchTextOptions
} from "../../src/providers/utils.js";

export async function fetchOptionalLiveHtml(
  url: string,
  options: FetchHtmlOptions = {}
): Promise<string | null> {
  return fetchOptionalLiveValue(url, () => fetchHtml(url, options));
}

export async function fetchOptionalLiveText(
  url: string,
  options: FetchTextOptions = {}
): Promise<string | null> {
  return fetchOptionalLiveValue(url, () => fetchText(url, options));
}

async function fetchOptionalLiveValue(
  url: string,
  fetcher: () => Promise<string>
): Promise<string | null> {
  try {
    return await fetcher();
  } catch (error) {
    console.warn(`Skipping live HTML assertion for ${url}: ${formatError(error)}`);
    return null;
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
