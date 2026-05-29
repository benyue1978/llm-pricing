import { fetchHtml, type FetchHtmlOptions } from "../../src/providers/utils.js";

export async function fetchOptionalLiveHtml(
  url: string,
  options: FetchHtmlOptions = {}
): Promise<string | null> {
  try {
    return await fetchHtml(url, options);
  } catch (error) {
    console.warn(`Skipping live HTML assertion for ${url}: ${formatError(error)}`);
    return null;
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
