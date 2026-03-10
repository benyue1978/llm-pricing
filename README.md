# llm-pricing

Official LLM pricing, tracked in one place.

`llm-pricing` is a CLI-first pricing registry for major model providers. It fetches official pricing pages, parses the live data, writes normalized JSON artifacts, and serves a static web experience for browsing pricing and operational status.

Repository:

- https://github.com/benyue1978/llm-pricing

Live site:

- https://llm-pricing.withus.fun

This repo is built for a simple workflow:

- run one CLI command
- regenerate machine-readable pricing data
- publish the repo as a static site
- let automation keep everything fresh

## Why this exists

Provider pricing is fragmented, inconsistent, and changes without warning.

If you compare model costs across OpenAI, Anthropic, Google, Qwen, Moonshot, Zhipu, and others, you usually end up with:

- a dozen tabs
- different currencies
- different page structures
- unclear update timing
- no reliable machine-readable output

`llm-pricing` fixes that by treating pricing aggregation as a build artifact, not a spreadsheet exercise.

## What you get

- A CLI that fetches provider pricing and regenerates repo data.
- A unified pricing registry in [`data/pricing.json`](/Users/song.yue/git/llm-pricing/data/pricing.json).
- An ops registry in [`data/ops.json`](/Users/song.yue/git/llm-pricing/data/ops.json) with provider run status, timestamps, durations, success/fallback/failure mode, and failure reason.
- A currency registry in [`data/currency_rate.json`](/Users/song.yue/git/llm-pricing/data/currency_rate.json), sourced from the European Central Bank daily reference feed.
- A root-hosted static pricing dashboard in [`index.html`](/Users/song.yue/git/llm-pricing/index.html).
- A root-hosted ops dashboard in [`ops.html`](/Users/song.yue/git/llm-pricing/ops.html).
- A test suite that covers live fetches, parser drift, CLI output generation, and browser behavior.

## Supported providers

Current provider implementations live under [`src/providers`](/Users/song.yue/git/llm-pricing/src/providers).

The repo currently supports live or rendered-official-page collection for:

- OpenAI
- Anthropic
- Google
- Mistral
- DeepSeek
- Qwen
- Moonshot
- MiniMax
- Zhipu

The project is designed so new providers can be added without changing the web layer. Add a provider fetcher, parser tests, and the CLI will include it in the next update run.

## Architecture

This project intentionally keeps the moving parts small:

- `src/cli/`
  - generates all repo data artifacts
- `src/providers/`
  - fetches and parses provider pricing pages
- `src/providers/lib/`
  - shared fetch, HTML, number parsing, and pricing helpers
- `src/fx.ts`
  - fetches and parses official currency rates
- `data/`
  - generated JSON artifacts committed to the repo
- root static files
  - `index.html`, `main.js`, `styles.css`, `ops.html`, `ops.js`

There is no backend. The repo itself is the product.

## Installation

```bash
git clone https://github.com/benyue1978/llm-pricing.git
cd llm-pricing
npm install
```

## Quick start

Build once:

```bash
npm run build
```

Generate fresh data:

```bash
npm run update
```

Preview the web app locally:

```bash
npm run web:dev
```

Then open:

- `http://localhost:4173/` for pricing
- `http://localhost:4173/ops.html` for provider run status

## CLI

The CLI entrypoint is [`src/cli/index.ts`](/Users/song.yue/git/llm-pricing/src/cli/index.ts), compiled to `dist/cli/index.js`.

### `update`

```bash
npm run update
```

or:

```bash
node dist/cli/index.js update
```

What it does:

- fetches all provider pricing sources
- records provider-by-provider execution metadata
- fetches official daily FX rates
- writes:
  - `data/pricing.json`
  - `data/ops.json`
  - `data/currency_rate.json`

Typical output looks like:

```text
Fetching openai pricing...
openai: live https://developers.openai.com/api/docs/pricing (46 models)
Fetching anthropic pricing...
anthropic: live official pricing page (10 models)
...
Updated data/pricing.json (288 models, updated_at=2026-03-10T04:19:47.338Z)
Updated data/ops.json (9 providers, updated_at=2026-03-10T04:19:47.338Z)
Updated data/currency_rate.json (30 currencies, updated_at=2026-03-09T00:00:00.000Z)
```

### `print`

Print the current pricing registry:

```bash
node dist/cli/index.js print
```

### `cheapest`

Print the cheapest model by raw input price from `pricing.json`:

```bash
node dist/cli/index.js cheapest
```

## Data artifacts

### `data/pricing.json`

Unified pricing output:

```json
{
  "updated_at": "2026-03-10T04:19:47.338Z",
  "models": [
    {
      "provider": "openai",
      "model": "gpt-4.1",
      "type": "text",
      "input_price_per_million": 2,
      "output_price_per_million": 8,
      "currency": "USD",
      "source": "https://platform.openai.com/pricing"
    }
  ]
}
```

Notes:

- prices are stored in each provider’s native currency
- the repo currently uses mostly `USD` and `CNY`
- `type` is the billing category, currently focused on text models
- `source` is the official pricing page URL used for that entry

### `data/ops.json`

Provider execution status for the latest update run:

```json
{
  "updated_at": "2026-03-10T04:19:47.338Z",
  "summary": {
    "provider_count": 9,
    "success_count": 9,
    "failure_count": 0,
    "live_count": 9,
    "fallback_count": 0,
    "model_count": 288
  },
  "providers": [
    {
      "provider": "openai",
      "success": true,
      "mode": "live",
      "model_count": 46,
      "started_at": "2026-03-10T02:44:28.334Z",
      "finished_at": "2026-03-10T02:44:30.568Z",
      "checked_at": "2026-03-10T02:44:30.568Z",
      "duration_ms": 2234,
      "message": "live https://developers.openai.com/api/docs/pricing (46 models)",
      "messages": [
        "live https://developers.openai.com/api/docs/pricing (46 models)"
      ],
      "fail_reason": null
    }
  ]
}
```

This file is what the ops page reads.

### `data/currency_rate.json`

FX rates used for display conversion on the web app:

```json
{
  "updated_at": "2026-03-09T00:00:00.000Z",
  "source": "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml",
  "base_currency": "EUR",
  "rates": {
    "EUR": 1,
    "USD": 1.1555,
    "CNY": 8.2881
  }
}
```

Source:

- European Central Bank daily euro foreign exchange reference rates

Why ECB:

- official central-bank source
- stable daily publication
- simple XML feed
- enough coverage for the currencies currently used by this repo

## Web app

The site is fully static and root-hosted.

### Pricing page

Files:

- [`index.html`](/Users/song.yue/git/llm-pricing/index.html)
- [`main.js`](/Users/song.yue/git/llm-pricing/main.js)
- [`styles.css`](/Users/song.yue/git/llm-pricing/styles.css)

Features:

- search by provider, model, type, currency, or source
- provider filter
- type filter
- sorting by provider, model, type, native currency, input price, or output price
- display currency conversion:
  - select `USD` to convert all visible prices to USD
  - select `CNY` to convert all visible prices to CNY
- converted price sorting using `currency_rate.json`
- native currency still shown explicitly in the table for transparency

### Ops page

Files:

- [`ops.html`](/Users/song.yue/git/llm-pricing/ops.html)
- [`ops.js`](/Users/song.yue/git/llm-pricing/ops.js)

Features:

- per-provider status
- live vs fallback vs failed mode
- success flag
- model count
- duration
- last checked timestamp
- final status message
- failure reason, if any

## Testing

### Unit and integration

```bash
npm run test:ci
```

Coverage includes:

- schema defaults
- provider utility helpers
- provider parser fixtures
- live fetch validation against official sources
- CLI output generation
- FX parsing and conversion
- provider aggregation and ops metadata

### Browser tests

```bash
npm run test:e2e
```

Playwright verifies:

- the pricing dashboard loads real generated artifacts
- search, filter, and sorting work
- display currency conversion changes rendered prices
- the ops page reads `ops.json` and renders provider status rows

## GitHub Actions

This repo is designed to be updated by automation.

The scheduled workflow should:

1. install dependencies
2. build the project
3. run `npm run update`
4. run `npm run test:ci`
5. run `npm run test:e2e`
6. commit updated data artifacts when they change

That makes the repo suitable for:

- GitHub Pages
- Vercel static hosting
- Cloudflare Pages
- any other static host that can serve the repo root

## Adding a provider

At a high level:

1. identify the official pricing source
2. build a parser against the real page structure
3. add a manual fallback
4. add fixture tests
5. add a live sentinel test that fails if the structure drifts
6. plug the provider into [`src/providers/index.ts`](/Users/song.yue/git/llm-pricing/src/providers/index.ts)
7. run `npm run update`

The provider utilities in [`src/providers/lib`](/Users/song.yue/git/llm-pricing/src/providers/lib) are there to keep this process consistent.

## Development commands

```bash
npm run build
npm run update
npm run test:ci
npm run test:e2e
npm run web:dev
```

## Design principles

- Official sources first
- CLI-generated artifacts only
- Static-site deployment
- Parser drift should fail tests early
- Native provider currency preserved in source data
- Converted currency is a display concern, backed by a documented FX source

## License

MIT
