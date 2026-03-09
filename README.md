# llm-pricing

LLM pricing registry + TypeScript CLI + static dashboard.

This repo is intentionally minimal: a single CLI command keeps a JSON registry of model pricing up to date, and a static web page renders that JSON without any backend.

## Features

- **CLI core**: `npx llm-pricing update` (or `npm run update`) fetches pricing data from multiple providers and writes a unified registry to `data/pricing.json`.
- **Single source of truth**: `data/pricing.json` is the only data source; everything else is derived from it.
- **Static dashboard**: `web/index.html` + `web/main.js` read `data/pricing.json` and render a pricing table, deployable to Vercel / Cloudflare Pages as pure static assets.
- **Scheduled updates**: GitHub Actions workflow updates the registry on a cron schedule and commits changes back to the repo.
- **Tests**:
  - Vitest unit tests for schema, providers, and CLI core.
  - Playwright e2e tests to ensure `data/pricing.json` is served correctly from the static site.

## Installation

Clone the repo and install dependencies:

```bash
git clone <your-fork-url> llm-pricing
cd llm-pricing
npm install
```

## CLI Usage

Build the CLI and run an update:

```bash
npm run build
npm run update
```

This will:

- Fetch pricing from providers (OpenAI via scraper + static fallbacks for others).
- Write a unified registry to `data/pricing.json`.
- Print a short summary:

```text
Fetching openai pricing...
Fetching anthropic pricing...
Fetching google pricing...
Fetching mistral pricing...
Fetching deepseek pricing...
Updated data/pricing.json (N models, updated_at=...)
```

You can also run the CLI directly (after a local install):

```bash
npx llm-pricing update
```

### Extra commands

After `npm run build`:

- `node dist/cli/index.js print` — print the current registry JSON to stdout.
- `node dist/cli/index.js cheapest` — print the cheapest model by input price.

## Data schema

The registry is stored in `data/pricing.json` with the following shape:

```json
{
  "updated_at": "2026-03-09T12:00:00.000Z",
  "models": [
    {
      "provider": "openai",
      "model": "gpt-4o",
      "input_price_per_million": 5,
      "output_price_per_million": 15,
      "currency": "USD",
      "source": "https://platform.openai.com/pricing"
    }
  ]
}
```

- Prices are normalized to **USD / 1M tokens**.
- `output_price_per_million` can be `null` if not applicable.
- `source` is typically the provider's pricing documentation URL.

The TypeScript types live in `src/schema.ts` and are used across CLI and providers.

## Providers

Provider implementations live in `src/providers/`:

- `openai` — HTML scraper for `https://platform.openai.com/pricing` with a conservative parser and a static fallback.
- `anthropic`, `google`, `mistral`, `deepseek` — static fallback implementations using values from their pricing docs.

The aggregator `src/providers/index.ts`:

- Exposes `fetchAllProviders(logger)` which:
  - Logs progress per provider.
  - Continues even if a single provider fails.
  - Returns a flat `PricingModel[]`.

## Web dashboard

The static dashboard lives under `web/`:

- `web/index.html` — layout, styles, containers for the pricing table and updated timestamp.
- `web/main.js` — fetches `/data/pricing.json`, sorts models by provider/model, and renders a table:
  - Columns: Provider, Model, Input $/1M, Output $/1M, Source.
  - Uses tabular numerics for price columns and links to provider pricing pages.

### Local preview

Serve the repo root and open the dashboard:

```bash
npm run web:dev
# then visit http://localhost:4173/web/index.html
```

Make sure you have run `npm run update` at least once so that `data/pricing.json` exists with fresh data.

## Testing

### Unit tests (Vitest)

Run the unit test suite:

```bash
npm test
```

Coverage:

- `schema` — `createEmptyRegistry` shape and defaults.
- `providers/openai` — HTML fixture parsing and manual fallback.
- `providers/index` — aggregation behavior and error-survival when a provider fails.
- `cli` — `runUpdate` behavior, including writing `data/pricing.json`.

### E2E tests (Playwright)

Playwright config lives in `playwright.config.ts`. To run e2e tests:

```bash
npm run test:e2e
```

This will:

- Start the static server via `npm run web:dev`.
- Hit `/web/index.html`.
- Assert that `/data/pricing.json` is served correctly and contains:
  - At least one model.
  - A valid `updated_at` timestamp.

## GitHub Actions (scheduled updates)

The workflow `.github/workflows/update-pricing.yml`:

- Runs every 6 hours (and on manual dispatch).
- Steps:
  - `npm ci`
  - `npm run build`
  - `npm run update`
  - `npm test`
  - `npm run test:e2e`
- If `data/pricing.json` changed, it commits and pushes with message:

```text
chore: update pricing data
```

This makes the repo act as a lightweight, auto-updating LLM pricing registry.

## Future ideas

- Add real scraping / API-based fetchers for non-OpenAI providers.
- Implement richer CLI commands:
  - Cost calculators (e.g., cost for N tokens).
  - `cheapest` variants by capability tier.
- Publish as a public npm package (`llm-pricing`) and use `npx llm-pricing` directly without cloning.

