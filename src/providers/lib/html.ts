import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";

export interface FindTableByHeadersOptions {
  headerSelector?: string;
  maxHeaderCells?: number;
}

export interface FindNextTableOptions {
  stopAt?: (current: Cheerio<AnyNode>) => boolean;
}

export function normalizeText(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function getCellTexts(
  $: CheerioAPI,
  row: AnyNode,
  selector = "td"
): string[] {
  return $(row)
    .find(selector)
    .toArray()
    .map((cell) => normalizeText($(cell).text()));
}

export function findTableByHeaders(
  $: CheerioAPI,
  requiredHeaders: string[],
  options: FindTableByHeadersOptions = {}
): Cheerio<AnyNode> {
  const headerSelector = options.headerSelector ?? "th";
  const expectedHeaders = requiredHeaders.map((header) => header.toLowerCase());

  return $("table")
    .filter((_, tableElement) => {
      let headers = $(tableElement)
        .find(headerSelector)
        .toArray()
        .map((cell) => normalizeText($(cell).text()).toLowerCase());

      if (typeof options.maxHeaderCells === "number") {
        headers = headers.slice(0, options.maxHeaderCells);
      }

      return expectedHeaders.every((header) =>
        headers.some((value) => value.includes(header))
      );
    })
    .first();
}

export function findNextTable(
  $: CheerioAPI,
  start: Cheerio<AnyNode>,
  options: FindNextTableOptions = {}
): Cheerio<AnyNode> {
  let current = start.next();

  while (current.length) {
    if (options.stopAt?.(current)) {
      break;
    }

    if (current.is("table")) {
      return current;
    }

    const nestedTable = current.find("table").first();
    if (nestedTable.length) {
      return nestedTable;
    }

    current = current.next();
  }

  return $("");
}
