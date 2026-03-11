import type { BenchmarkDefinition, BenchmarkRegistry, BenchmarkScore, PricingModel, RegistrySource } from "./schema.js";
import { fetchHtml, fetchText } from "./providers/utils.js";

const SOURCES: RegistrySource[] = [
  {
    id: "livebench-official",
    name: "LiveBench official leaderboard",
    kind: "benchmark_official",
    url: "https://livebench.ai/",
    official: true,
    scope: "benchmark",
    notes: "Official LiveBench leaderboard with model score tables loaded from release CSV and category JSON assets."
  },
  {
    id: "livecodebench-official",
    name: "LiveCodeBench official leaderboard",
    kind: "benchmark_official",
    url: "https://livecodebench.github.io/leaderboard.html",
    official: true,
    scope: "benchmark",
    notes: "Official LiveCodeBench leaderboard with JSON-backed pass@1 computation."
  },
  {
    id: "swe-bench-official",
    name: "SWE-bench official leaderboard",
    kind: "benchmark_official",
    url: "https://www.swebench.com/",
    official: true,
    scope: "benchmark",
    notes: "Official SWE-bench leaderboard with embedded JSON data."
  }
];

const DEFINITIONS: BenchmarkDefinition[] = [
  {
    id: "livebench_overall",
    name: "LiveBench Overall",
    category: "general",
    maintainer: "LiveBench",
    metric_name: "mean task score",
    score_direction: "higher_is_better",
    source_url: "https://livebench.ai/",
    docs_url: "https://github.com/LiveBench/LiveBench",
    applicable_modalities: ["text"],
    suitable_for_normalized_price: true,
    notes: "Best broad benchmark for most text models in this project. Computed from the official LiveBench release table."
  },
  {
    id: "livebench_coding",
    name: "LiveBench Coding",
    category: "coding",
    maintainer: "LiveBench",
    metric_name: "coding category mean",
    score_direction: "higher_is_better",
    source_url: "https://livebench.ai/",
    docs_url: "https://github.com/LiveBench/LiveBench",
    applicable_modalities: ["text"],
    suitable_for_normalized_price: true,
    notes: "Specialized coding view derived from the official LiveBench coding category columns."
  },
  {
    id: "livebench_agentic_coding",
    name: "LiveBench Agentic Coding",
    category: "coding-agent",
    maintainer: "LiveBench",
    metric_name: "agentic coding category mean",
    score_direction: "higher_is_better",
    source_url: "https://livebench.ai/",
    docs_url: "https://github.com/LiveBench/LiveBench",
    applicable_modalities: ["text"],
    suitable_for_normalized_price: true,
    notes: "Specialized agentic coding view derived from the official LiveBench agentic coding category columns."
  },
  {
    id: "livecodebench_pass1",
    name: "LiveCodeBench Pass@1",
    category: "coding",
    maintainer: "LiveCodeBench",
    metric_name: "pass@1",
    score_direction: "higher_is_better",
    source_url: "https://livecodebench.github.io/leaderboard.html",
    docs_url: "https://livecodebench.github.io/",
    applicable_modalities: ["text"],
    suitable_for_normalized_price: true,
    notes: "Coding-specialized price efficiency view using official LiveCodeBench pass@1 data."
  },
  {
    id: "swe_bench_bash_only",
    name: "SWE-bench Bash-only",
    category: "coding-agent",
    maintainer: "SWE-bench",
    metric_name: "resolved rate",
    score_direction: "higher_is_better",
    source_url: "https://www.swebench.com/",
    docs_url: "https://www.swebench.com/",
    applicable_modalities: ["text"],
    suitable_for_normalized_price: true,
    notes: "Agentic coding view using the official SWE-bench bash-only leaderboard."
  }
];

export async function fetchBenchmarkRegistry(
  pricingModels: PricingModel[],
  updatedAt = new Date().toISOString()
): Promise<BenchmarkRegistry> {
  const allScores = [
    ...(await fetchLiveBenchScores(pricingModels)),
    ...(await fetchLiveCodeBenchScores(pricingModels)),
    ...(await fetchSweBenchScores(pricingModels))
  ];

  return {
    updated_at: updatedAt,
    sources: SOURCES,
    benchmarks: DEFINITIONS,
    results: allScores.sort((left, right) =>
      left.benchmark_id.localeCompare(right.benchmark_id) ||
      left.provider.localeCompare(right.provider) ||
      left.model.localeCompare(right.model)
    )
  };
}

export function parseLiveBenchCsv(
  csv: string,
  categories: Record<string, string[]>
): Array<{ benchmarkModel: string; scores: Record<string, number> }> {
  const [headerLine, ...lines] = csv.trim().split(/\r?\n/);
  const headers = headerLine.split(",");
  const rows: Array<{ benchmarkModel: string; scores: Record<string, number> }> = [];

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const cells = line.split(",");
    const benchmarkModel = cells[0];
    const values = Object.fromEntries(
      headers.slice(1).map((header, index) => [header, Number.parseFloat(cells[index + 1])])
    );

    const overall = mean(Object.values(values).filter((value) => Number.isFinite(value)));
    const coding = mean((categories.Coding ?? []).map((key) => values[key]).filter((value) => Number.isFinite(value)));
    const agenticCoding = mean(
      (categories["Agentic Coding"] ?? []).map((key) => values[key]).filter((value) => Number.isFinite(value))
    );

    rows.push({
      benchmarkModel,
      scores: {
        livebench_overall: overall,
        livebench_coding: coding,
        livebench_agentic_coding: agenticCoding
      }
    });
  }

  return rows;
}

export function parseSweBenchHtml(html: string): Array<{ benchmarkModel: string; score: number; evaluatedAt: string | null; sourceUrl: string }> {
  const match = html.match(/<script type="application\/json" id="leaderboard-data">([\s\S]*?)<\/script>/);
  if (!match) {
    return [];
  }

  const sections = JSON.parse(match[1]) as Array<{ name: string; results: any[] }>;
  const bashOnly = sections.find((section) => section.name === "bash-only");
  if (!bashOnly) {
    return [];
  }

  return bashOnly.results
    .filter((result) => typeof result.name === "string" && Number.isFinite(result.resolved))
    .map((result) => ({
      benchmarkModel: result.name as string,
      score: result.resolved as number,
      evaluatedAt: typeof result.date === "string" ? result.date : null,
      sourceUrl: typeof result.site === "string" ? result.site : "https://www.swebench.com/"
    }));
}

export function parseLiveCodeBenchData(data: {
  performances: Array<{ model: string; date: number; difficulty: string; "pass@1": number }>;
  models: Array<{ model_repr: string; link?: string; release_date?: string | null }>;
}): Array<{ benchmarkModel: string; score: number; evaluatedAt: string | null; sourceUrl: string }> {
  return data.models
    .filter((model) => Boolean(model.release_date))
    .map((model) => {
      const scores = data.performances
        .filter((entry) => entry.model === model.model_repr)
        .map((entry) => entry["pass@1"])
        .filter((value) => Number.isFinite(value));

      return {
        benchmarkModel: model.model_repr,
        score: mean(scores),
        evaluatedAt: typeof model.release_date === "string" ? model.release_date : null,
        sourceUrl: model.link || "https://livecodebench.github.io/leaderboard.html"
      };
    })
    .filter((row) => Number.isFinite(row.score));
}

async function fetchLiveBenchScores(pricingModels: PricingModel[]): Promise<BenchmarkScore[]> {
  const release = await discoverLiveBenchRelease();
  const [csv, categoriesRaw] = await Promise.all([
    fetchText(`https://livebench.ai/table_${release}.csv`, {
      accept: "text/csv,text/plain,*/*",
      validateText: (candidate) => candidate.startsWith("model,")
    }),
    fetchText(`https://livebench.ai/categories_${release}.json`, {
      accept: "application/json,text/plain,*/*",
      validateText: (candidate) => candidate.includes("Coding")
    })
  ]);
  const categories = JSON.parse(categoriesRaw) as Record<string, string[]>;
  const rows = parseLiveBenchCsv(csv, categories);

  return mapBenchmarkRows(pricingModels, rows.flatMap((row) =>
    Object.entries(row.scores).map(([benchmarkId, score]) => ({
      benchmarkId,
      benchmarkModel: row.benchmarkModel,
      score,
      evaluatedAt: release.replace(/_/g, "-"),
      sourceUrl: `https://livebench.ai/table_${release}.csv`
    }))
  ));
}

async function discoverLiveBenchRelease(): Promise<string> {
  const manifestRaw = await fetchText("https://livebench.ai/asset-manifest.json", {
    accept: "application/json,text/plain,*/*",
    validateText: (candidate) => candidate.includes("main.js")
  });
  const manifest = JSON.parse(manifestRaw) as { files?: Record<string, string> };
  const mainJsPath = manifest.files?.["main.js"];
  if (!mainJsPath) {
    throw new Error("LiveBench main.js asset missing");
  }

  const mainJs = await fetchText(new URL(mainJsPath, "https://livebench.ai/").toString(), {
    accept: "application/javascript,text/javascript,*/*",
    validateText: (candidate) => candidate.includes("table_${r}.csv")
  });
  const candidates = [...new Set([...mainJs.matchAll(/20\d\d-\d\d-\d\d/g)].map((match) => match[0].replace(/-/g, "_")))]
    .sort()
    .reverse();

  for (const candidate of candidates.slice(0, 24)) {
    try {
      const [hasTable, hasCategories] = await Promise.all([
        checkUrlExists(`https://livebench.ai/table_${candidate}.csv`),
        checkUrlExists(`https://livebench.ai/categories_${candidate}.json`)
      ]);
      if (!hasTable || !hasCategories) {
        continue;
      }
      return candidate;
    } catch {
      // Try the next release candidate.
    }
  }

  throw new Error("LiveBench release assets not found");
}

async function fetchLiveCodeBenchScores(pricingModels: PricingModel[]): Promise<BenchmarkScore[]> {
  const html = await fetchHtml("https://livecodebench.github.io/leaderboard.html", {
    validateHtml: (candidate) => candidate.includes("performances_generation.json")
  });
  const datasetMatch = html.match(/const DEFAULT_DATASET = '([^']+\.json)'/);
  const datasetPath = datasetMatch?.[1] ?? "performances_generation.json";
  const raw = await fetchText(new URL(datasetPath, "https://livecodebench.github.io/").toString(), {
    accept: "application/json,text/plain,*/*",
    validateText: (candidate) => candidate.includes("\"performances\"") && candidate.includes("\"models\"")
  });
  const rows = parseLiveCodeBenchData(JSON.parse(raw));

  return mapBenchmarkRows(pricingModels, rows.map((row) => ({
    benchmarkId: "livecodebench_pass1",
    benchmarkModel: row.benchmarkModel,
    score: row.score,
    evaluatedAt: row.evaluatedAt,
    sourceUrl: row.sourceUrl
  })));
}

async function fetchSweBenchScores(pricingModels: PricingModel[]): Promise<BenchmarkScore[]> {
  const html = await fetchHtml("https://www.swebench.com/", {
    validateHtml: (candidate) => candidate.includes("leaderboard-data")
  });
  const rows = parseSweBenchHtml(html);

  return mapBenchmarkRows(pricingModels, rows.map((row) => ({
    benchmarkId: "swe_bench_bash_only",
    benchmarkModel: row.benchmarkModel,
    score: row.score,
    evaluatedAt: row.evaluatedAt,
    sourceUrl: row.sourceUrl
  })));
}

export function mapBenchmarkRows(
  pricingModels: PricingModel[],
  rows: Array<{ benchmarkId: string; benchmarkModel: string; score: number; evaluatedAt: string | null; sourceUrl: string }>
): BenchmarkScore[] {
  const aliases = pricingModels.map((model) => ({
    model,
    aliases: buildBenchmarkAliases(model).map(normalizeKey)
  }));
  const grouped = new Map<string, { total: number; count: number; evaluatedAt: string | null; sourceUrl: string; benchmarkId: string; provider: string; model: string; matched: Set<string> }>();

  for (const row of rows) {
    const key = normalizeKey(row.benchmarkModel);
    for (const entry of aliases) {
      if (!entry.aliases.includes(key)) {
        continue;
      }

      const groupKey = `${row.benchmarkId}:${entry.model.provider}:${entry.model.model}`;
      const group = grouped.get(groupKey) ?? {
        total: 0,
        count: 0,
        evaluatedAt: row.evaluatedAt,
        sourceUrl: row.sourceUrl,
        benchmarkId: row.benchmarkId,
        provider: entry.model.provider,
        model: entry.model.model,
        matched: new Set<string>()
      };

      if (group.matched.has(row.benchmarkModel)) {
        continue;
      }

      group.total += row.score;
      group.count += 1;
      group.evaluatedAt = group.evaluatedAt ?? row.evaluatedAt;
      group.matched.add(row.benchmarkModel);
      grouped.set(groupKey, group);
    }
  }

  return [...grouped.values()]
    .filter((group) => group.count > 0)
    .map((group) => {
      const matchedBenchmarkModels = [...group.matched].sort();

      return {
        provider: group.provider,
        model: group.model,
        benchmark_id: group.benchmarkId,
        score: Number((group.total / group.count).toFixed(2)),
        score_unit: "points",
        evaluated_at: group.evaluatedAt,
        source_url: group.sourceUrl,
        benchmark_model: matchedBenchmarkModels.length === 1 ? matchedBenchmarkModels[0] : null,
        matched_benchmark_models: matchedBenchmarkModels,
        notes: group.count > 1 ? `Averaged across ${group.count} matched official variants.` : null
      };
    });
}

export function buildBenchmarkAliases(model: PricingModel): string[] {
  const value = model.model.toLowerCase();
  const aliases = new Set<string>();

  function add(...items: string[]) {
    for (const item of items) {
      aliases.add(item);
    }
  }

  if (model.provider === "openai") {
    if (value.includes("gpt-5.4-pro")) add("gpt-5-pro-2025-10-06");
    if (value.includes("gpt-5.4")) add("gpt-5.4-high", "gpt-5.4-xhigh");
    if (value.includes("gpt-5.3-codex")) add("gpt-5.3-codex-high", "gpt-5.3-codex-xhigh");
    if (value.includes("gpt-5.2-codex")) add("gpt-5.2-codex");
    if (value.includes("gpt-5.1-codex-max")) add("gpt-5.1-codex-max", "gpt-5.1-codex-max-high");
    if (value.includes("gpt-5.1-codex") && !value.includes("max")) add("gpt-5.1-codex");
    if (value.includes("gpt-5.2") && !value.includes("codex")) add(
      "gpt-5.2-2025-12-11-high",
      "gpt-5.2-2025-12-11-medium",
      "gpt-5.2-2025-12-11-low",
      "gpt-5.2-2025-12-11-nothinking"
    );
    if (value.includes("gpt-5.1") && !value.includes("codex")) add(
      "gpt-5.1-2025-11-13-high",
      "gpt-5.1-2025-11-13-medium",
      "gpt-5.1-2025-11-13-low",
      "gpt-5.1-2025-11-13-nothinking"
    );
    if (value === "gpt-5-mini") add("gpt-5-mini", "gpt-5-mini-high", "gpt-5-mini-low", "gpt-5-mini-minimal");
    if (value === "gpt-5-nano") add("gpt-5-nano", "gpt-5-nano-high", "gpt-5-nano-low");
    if (value === "gpt-4.1") add("gpt-4.1-2025-04-14");
    if (value === "gpt-4.1-mini") add("gpt-4.1-mini-2025-04-14");
    if (value === "gpt-4o-mini") add("gpt-4o-mini-2024-07-18");
    if (value === "gpt-4o") add("gpt-4o-2024-08-06");
    if (value === "o3") add("o3high");
    if (value === "o4-mini") add("o4minihigh");
  }

  if (model.provider === "anthropic") {
    if (value === "claude-opus-4.6") add("claude-opus-4-6-thinking-auto-high-effort");
    if (value === "claude-opus-4.5") add(
      "claude-opus-4-5-20251101-high-effort",
      "claude-opus-4-5-20251101-medium-effort",
      "claude-opus-4-5-20251101-low-effort"
    );
    if (value === "claude-opus-4.1" || value === "claude-opus-4") add(
      "claude-4-1-opus-20250805-base",
      "claude-4-1-opus-20250805-thinking-32k"
    );
    if (value === "claude-sonnet-4.6") add(
      "claude-sonnet-4-6-thinking-auto-high-effort",
      "claude-sonnet-4-6-thinking-auto-medium-effort",
      "claude-sonnet-4-6-thinking-auto-low-effort"
    );
    if (value === "claude-sonnet-4.5") add("claude-sonnet-4-5-20250929", "claude-sonnet-4-5-20250929-thinking-64k");
    if (value === "claude-sonnet-4") add("claude-4-sonnet-20250514-base", "claude-4-sonnet-20250514-thinking-64k");
    if (value === "claude-haiku-4.5") add("claude-haiku-4-5-20251001", "claude-haiku-4-5-20251001-thinking-64k");
    if (value === "claude-haiku-3.5") add("claude-3.5-sonnet-20241022");
    if (value === "claude-haiku-3") add("claude-3-haiku");
  }

  if (model.provider === "google") {
    if (value.includes("gemini-2.5-pro")) add("gemini-2.5-pro-06-05-highthinking", "gemini-2.5-pro-05-06");
    if (value === "gemini-2.5-flash") add("gemini-2.5-flash-06-05-highthinking", "gemini-2.5-flash-05-20");
    if (value.startsWith("gemini-3.1-pro")) add("gemini-3.1-pro-preview-high");
    if (value.startsWith("gemini-3-flash")) add("gemini-3-flash-preview-high", "gemini-3-flash-preview-minimal");
    if (value.startsWith("gemini-3.1-flash-lite")) add("gemini-3.1-flash-lite-preview-high");
  }

  if (model.provider === "deepseek") {
    if (value.includes("reasoner")) add("deepseek-r1-0528", "deepseek-v3.2-thinking");
    if (value.includes("chat")) add("deepseek-v3", "deepseek-v3.2");
  }

  if (model.provider === "qwen") {
    if (value.includes("qwen3-max") || value.includes("qwen-max")) add(
      "qwen3-235b-a22b-instruct-2507",
      "qwen3-235b-a22b-thinking-2507",
      "qwen3-235b-a22b"
    );
    if (value.includes("qwen-plus") || value.includes("qwen3.5-plus")) add(
      "qwen3-next-80b-a3b-instruct",
      "qwen3-next-80b-a3b-thinking"
    );
  }

  if (model.provider === "moonshot") {
    if (value === "kimi-k2.5") add("kimi-k2.5-thinking", "kimi-k2.5highreasoning");
    if (value === "kimi-k2-thinking") add("kimi-k2-thinking");
    if (value.includes("kimi-k2") && !value.includes("thinking") && !value.includes("2.5")) add("kimi-k2-instruct");
  }

  if (model.provider === "zhipu") {
    if (value === "glm-5") add("glm-5", "glm-5highreasoning");
    if (value === "glm-4.7") add("glm-4.7");
  }

  return [...aliases];
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function mean(values: number[]): number {
  if (!values.length) {
    return Number.NaN;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function checkUrlExists(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "user-agent": "Mozilla/5.0"
      },
      signal: controller.signal
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
