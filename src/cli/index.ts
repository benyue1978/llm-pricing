#!/usr/bin/env node

import { writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { fetchAllProviders } from "../providers/index.js";
import type { PricingModel, PricingRegistry } from "../schema.js";

export type Logger = (message: string) => void;

export interface RunUpdateOptions {
  cwd?: string;
  logger?: Logger;
  fetchAll?: (logger: Logger) => Promise<PricingModel[]>;
}

export interface RunUpdateResult {
  registry: PricingRegistry;
  outputPath: string;
}

export async function runUpdate(options: RunUpdateOptions = {}): Promise<RunUpdateResult> {
  const cwd = options.cwd ?? process.cwd();
  const logger = options.logger ?? console.log;
  const fetchAll = options.fetchAll ?? fetchAllProviders;

  const models = await fetchAll(logger);
  const registry: PricingRegistry = {
    updated_at: new Date().toISOString(),
    models
  };

  const outputPath = resolve(cwd, "data/pricing.json");
  const json = JSON.stringify(registry, null, 2) + "\n";
  await writeFile(outputPath, json, "utf8");

  logger(`Updated data/pricing.json (${registry.models.length} models, updated_at=${registry.updated_at})`);

  return { registry, outputPath };
}

async function cmdPrint(cwd: string): Promise<void> {
  const path = resolve(cwd, "data/pricing.json");
  const raw = await readFile(path, "utf8");
  // eslint-disable-next-line no-console
  console.log(raw);
}

async function cmdCheapest(cwd: string): Promise<void> {
  const path = resolve(cwd, "data/pricing.json");
  const raw = await readFile(path, "utf8");
  const registry = JSON.parse(raw) as PricingRegistry;
  if (!registry.models.length) {
    // eslint-disable-next-line no-console
    console.log("No models available in registry.");
    return;
  }
  const cheapest = [...registry.models].sort(
    (a, b) => a.input_price_per_million - b.input_price_per_million
  )[0];
  // eslint-disable-next-line no-console
  console.log(
    `Cheapest by input: ${cheapest.provider}/${cheapest.model} - $${cheapest.input_price_per_million} per 1M tokens`
  );
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const [cmd = "update"] = argv;
  const cwd = process.cwd();

  if (cmd === "update") {
    await runUpdate();
    return;
  }

  if (cmd === "print") {
    await cmdPrint(cwd);
    return;
  }

  if (cmd === "cheapest") {
    await cmdCheapest(cwd);
    return;
  }

  // eslint-disable-next-line no-console
  console.error(`Unknown command: ${cmd}`);
  process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // eslint-disable-next-line no-console
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

