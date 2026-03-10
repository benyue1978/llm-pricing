export function parseUsdAmount(raw: string | undefined): number {
  return parseCurrencyAmount(raw, /\$([0-9]+(?:\.[0-9]+)?)/);
}

export function parseCnyAmount(raw: string | undefined): number {
  return parseCurrencyAmount(raw, /[¥￥]\s*([0-9]+(?:\.[0-9]+)?)/);
}

export function extractUsdAmounts(text: string | undefined): number[] {
  if (!text) {
    return [];
  }

  return [...text.replace(/,/g, "").matchAll(/\$([0-9]+(?:\.[0-9]+)?)/g)]
    .map((match) => Number.parseFloat(match[1]))
    .filter((value) => Number.isFinite(value));
}

function parseCurrencyAmount(raw: string | undefined, pattern: RegExp): number {
  if (!raw) {
    return Number.NaN;
  }

  const match = raw.replace(/,/g, "").match(pattern);
  if (!match) {
    return Number.NaN;
  }

  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) ? value : Number.NaN;
}
