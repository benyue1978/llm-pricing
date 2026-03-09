---
name: provider-pricing-workflow
description: Use when adding or updating any LLM provider pricing source in this repo. Follow the official-source-only workflow for locating pricing pages, implementing parsers, validating units, adding tests, and updating data/pricing.json.
---

# Provider Pricing Workflow

Use this skill whenever a provider is added or its pricing logic is changed.

## Rules

- Use only the provider's official pricing page or official docs as the source of truth.
- Never use aggregator sites for pricing values.
- Store the official page URL in each pricing record's `source` field.
- Normalize token prices to USD per 1M tokens before returning `PricingModel[]`.
- Set the `type` field explicitly for every output record.

## Implementation Flow

1. Find the official pricing URL.
2. Inspect the real page structure before writing parser logic.
3. Identify the billing unit and convert it to `input_price_per_million` and `output_price_per_million`.
4. Implement the provider fetcher in `src/providers/`.
5. Add a fixture-based parser test that mirrors the real DOM shape closely.
6. Add or update fetch-level validation in `tests/unit/providers-fetch.test.ts`.
7. Run provider-focused Vitest tests.
8. Update `data/pricing.json` through the CLI so the checked-in registry matches the schema.

## Checklist

- Official pricing URL recorded
- Parser matches real page structure, not synthetic attributes
- Non-target billing categories filtered out
- `type`, `currency`, and `source` set on every record
- Fixture test added or refreshed
- Fetch-level test validated
- `data/pricing.json` regenerated
- Test commands and outcomes recorded in the task response

## Notes

- If the official page redirects, treat the redirected official page as valid implementation input, but keep `source` aligned with the canonical URL used by the project.
- If the page is dynamic, prefer parsing stable server-rendered HTML or stable DOM attributes over brittle class names.
- If the workflow misses a recurring edge case, update this skill first, then finish the provider change.
