#!/usr/bin/env node

import { writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { fetchAllProvidersDetailed } from "../providers/index.js";
import type { OpsRegistry, PricingModel, PricingRegistry, ProviderOpsStatus } from "../schema.js";

export type Logger = (message: string) => void;

export interface RunUpdateOptions {
  cwd?: string;
  logger?: Logger;
  fetchAll?: (logger: Logger) => Promise<PricingModel[]>;
  fetchAllDetailed?: (logger: Logger) => Promise<{
    models: PricingModel[];
    providerStatuses: ProviderOpsStatus[];
  }>;
}

export interface RunUpdateResult {
  registry: PricingRegistry;
  opsRegistry: OpsRegistry;
  outputPath: string;
  opsOutputPath: string;
}

export async function runUpdate(options: RunUpdateOptions = {}): Promise<RunUpdateResult> {
  const cwd = options.cwd ?? process.cwd();
  const logger = options.logger ?? console.log;
  const detailedResult = options.fetchAllDetailed
    ? await options.fetchAllDetailed(logger)
    : options.fetchAll
      ? {
        models: await options.fetchAll(logger),
        providerStatuses: []
      }
      : await fetchAllProvidersDetailed(logger);
  const models = detailedResult.models;
  const updatedAt = new Date().toISOString();
  const registry: PricingRegistry = {
    updated_at: updatedAt,
    models
  };
  const opsRegistry = createOpsRegistry(updatedAt, detailedResult.providerStatuses, models.length);

  const outputPath = resolve(cwd, "data/pricing.json");
  const opsOutputPath = resolve(cwd, "data/ops.json");
  const json = JSON.stringify(registry, null, 2) + "\n";
  const opsJson = JSON.stringify(opsRegistry, null, 2) + "\n";
  await writeFile(outputPath, json, "utf8");
  await writeFile(opsOutputPath, opsJson, "utf8");

  logger(`Updated data/pricing.json (${registry.models.length} models, updated_at=${registry.updated_at})`);
  logger(`Updated data/ops.json (${opsRegistry.providers.length} providers, updated_at=${opsRegistry.updated_at})`);

  return { registry, opsRegistry, outputPath, opsOutputPath };
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

function createOpsRegistry(
  updatedAt: string,
  providerStatuses: ProviderOpsStatus[],
  modelCount: number
): OpsRegistry {
  const successCount = providerStatuses.filter((status) => status.success).length;
  const failureCount = providerStatuses.length - successCount;
  const liveCount = providerStatuses.filter((status) => status.mode === "live").length;
  const fallbackCount = providerStatuses.filter((status) => status.mode === "fallback").length;

  return {
    updated_at: updatedAt,
    summary: {
      provider_count: providerStatuses.length,
      success_count: successCount,
      failure_count: failureCount,
      live_count: liveCount,
      fallback_count: fallbackCount,
      model_count: modelCount
    },
    providers: providerStatuses
  };
}
