export {
  fetchHtml,
  fetchJson,
  fetchProviderPricing,
  fetchText,
  fetchRenderedHtml
} from "./lib/fetch.js";
export { findNextTable, findTableByHeaders, getCellTexts, normalizeText } from "./lib/html.js";
export {
  extractAssignedArray,
  extractBracketedValue,
  extractConditionalAssignedArray,
  findScriptSrc,
  getJsNumberProperty,
  getJsStringArrayFirst,
  getJsStringProperty,
  splitTopLevelObjects
} from "./lib/javascript.js";
export { extractUsdAmounts, parseCnyAmount, parseUsdAmount } from "./lib/numbers.js";
export { createTextPricingModel } from "./lib/pricing.js";
