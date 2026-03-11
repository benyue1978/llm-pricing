import type {
  ModelCatalogEntry,
  ModelCatalogRegistry,
  PricingModel,
  RegistrySource
} from "./schema.js";

const METADATA_SOURCES: RegistrySource[] = [
  {
    id: "openai-models-docs",
    name: "OpenAI models documentation",
    kind: "provider_docs",
    url: "https://platform.openai.com/docs/models",
    official: true,
    scope: "metadata",
    notes: "Canonical OpenAI model docs for API model capabilities and lifecycle."
  },
  {
    id: "anthropic-models-overview",
    name: "Anthropic models overview",
    kind: "provider_docs",
    url: "https://docs.anthropic.com/en/docs/models-overview",
    official: true,
    scope: "metadata",
    notes: "Canonical Anthropic docs for Claude model families and lifecycle."
  },
  {
    id: "google-gemini-models",
    name: "Google Gemini models",
    kind: "provider_docs",
    url: "https://ai.google.dev/gemini-api/docs/models",
    official: true,
    scope: "metadata",
    notes: "Canonical Gemini API docs for model names, context windows, and model status."
  },
  {
    id: "mistral-models",
    name: "Mistral models documentation",
    kind: "provider_docs",
    url: "https://docs.mistral.ai/getting-started/models/",
    official: true,
    scope: "metadata",
    notes: "Canonical Mistral docs for API model families and recommended use cases."
  },
  {
    id: "deepseek-api-pricing",
    name: "DeepSeek API pricing and model docs",
    kind: "provider_docs",
    url: "https://api-docs.deepseek.com/quick_start/pricing",
    official: true,
    scope: "metadata",
    notes: "DeepSeek pricing/docs page currently doubles as the most stable public API model reference."
  },
  {
    id: "qwen-pricing",
    name: "Qwen pricing and model reference",
    kind: "provider_docs",
    url: "https://help.aliyun.com/zh/model-studio/models",
    official: true,
    scope: "metadata",
    notes: "Alibaba Cloud Model Studio model directory is the preferred Qwen metadata source when available."
  },
  {
    id: "moonshot-platform-docs",
    name: "Moonshot platform docs",
    kind: "provider_docs",
    url: "https://platform.moonshot.ai/docs/guide",
    official: true,
    scope: "metadata",
    notes: "Moonshot platform docs and pricing pages are the canonical public API references."
  },
  {
    id: "minimax-pricing",
    name: "MiniMax pricing and model docs",
    kind: "provider_docs",
    url: "https://www.minimax.io/platform/document/Price",
    official: true,
    scope: "metadata",
    notes: "MiniMax public developer docs currently expose model metadata mainly through pricing and API docs."
  },
  {
    id: "zhipu-model-overview",
    name: "Zhipu model overview",
    kind: "provider_docs",
    url: "https://docs.bigmodel.cn/cn/guide/start/model-overview",
    official: true,
    scope: "metadata",
    notes: "Canonical Zhipu docs for model families and modality separation."
  },
  {
    id: "huggingface-model-cards",
    name: "Hugging Face model cards",
    kind: "huggingface_model_card",
    url: "https://huggingface.co/docs/hub/model-cards",
    official: true,
    scope: "metadata",
    notes: "Use for open-weight models only. Not canonical for proprietary hosted APIs."
  }
];

export function buildModelCatalogRegistry(
  updatedAt: string,
  pricingModels: PricingModel[]
): ModelCatalogRegistry {
  const models = [...pricingModels]
    .sort((left, right) =>
      left.provider.localeCompare(right.provider) || left.model.localeCompare(right.model)
    )
    .map((model) => buildModelCatalogEntry(model));

  return {
    updated_at: updatedAt,
    sources: METADATA_SOURCES,
    models
  };
}

export function buildModelCatalogEntry(pricingModel: PricingModel): ModelCatalogEntry {
  const metadataSource = getMetadataSourceForProvider(pricingModel.provider);
  const family = inferModelFamily(pricingModel.model);
  const comparisonBuckets = inferComparisonBuckets(pricingModel.model, pricingModel.type);
  const releaseStage = inferReleaseStage(pricingModel.model);

  return {
    provider: pricingModel.provider,
    model: pricingModel.model,
    family,
    access_type: "api",
    openness: "closed",
    modalities: [pricingModel.type],
    comparison_buckets: comparisonBuckets,
    release_stage: releaseStage,
    context_window_tokens: null,
    max_output_tokens: null,
    parameter_count_billions: null,
    license: null,
    model_page_url: metadataSource?.url ?? pricingModel.source,
    metadata_source_ids: uniqueStrings([metadataSource?.id, "huggingface-model-cards"].filter(Boolean) as string[]),
    pricing_source_url: pricingModel.source,
    benchmark_ids: inferBenchmarkIds(comparisonBuckets),
    notes: [
      "Do not compare this model globally by price alone.",
      "Use comparison buckets and benchmark-specific views for normalized cost analysis."
    ]
  };
}

function getMetadataSourceForProvider(provider: string): RegistrySource | undefined {
  return METADATA_SOURCES.find((source) => source.id.startsWith(provider));
}

export function inferModelFamily(model: string): string {
  const lower = model.toLowerCase();
  const patterns: Array<[RegExp, string]> = [
    [/^gpt-5/, "gpt-5"],
    [/^gpt-4\.1/, "gpt-4.1"],
    [/^gpt-4o/, "gpt-4o"],
    [/^o[134]/, "openai-reasoning"],
    [/^claude-3-7/, "claude-3.7"],
    [/^claude-3-5/, "claude-3.5"],
    [/^claude-opus-4/, "claude-opus-4"],
    [/^claude-sonnet-4/, "claude-sonnet-4"],
    [/^gemini-2\.5/, "gemini-2.5"],
    [/^gemini-2\.0/, "gemini-2.0"],
    [/^mistral-(small|medium|large)/, "mistral-text"],
    [/^codestral/, "codestral"],
    [/^ministral/, "ministral"],
    [/^deepseek-/, "deepseek"],
    [/^qwen/, "qwen"],
    [/^kimi-k2\.5/, "kimi-k2.5"],
    [/^kimi-k2/, "kimi-k2"],
    [/^moonshot-v1/, "moonshot-v1"],
    [/^abab/, "minimax-abab"],
    [/^glm-5/, "glm-5"],
    [/^glm-4\.7/, "glm-4.7"],
    [/^glm-4\.5/, "glm-4.5"]
  ];

  for (const [pattern, family] of patterns) {
    if (pattern.test(lower)) {
      return family;
    }
  }

  return model.replace(/[-_](preview|flash|turbo|mini|nano|air|thinking).*$/i, "");
}

export function inferComparisonBuckets(model: string, type: string): string[] {
  const lower = model.toLowerCase();
  const buckets = new Set<string>([`${type}-models`]);

  if (/(^|[-_.])(code|codex|codestral|devstral)([-_.]|$)|computer-use/.test(lower)) {
    buckets.add("coding");
  }

  if (/(codex|devstral|deep-research|computer-use|glm-5-code)/.test(lower)) {
    buckets.add("agentic-coding");
  }

  if (/\b(reasoning|thinking)\b/.test(lower) || /^o[134]/.test(lower) || /(qwq|reasoner|magistral|glm-5)/.test(lower)) {
    buckets.add("reasoning");
  }

  if (/\b(flash|mini|nano|air|turbo|free|lite|small|haiku|highspeed)\b/.test(lower) || /(flashx|3b|7b|8b|12b|14b)/.test(lower)) {
    buckets.add("low-cost");
  }

  if (/\b(max|opus|large|pro)\b/.test(lower) || /^gpt-5(\b|[.-])/.test(lower) || /(qwen3-max|minimax-m2\.5|kimi-k2\.5|glm-5)/.test(lower)) {
    buckets.add("frontier");
  }

  if (/\b32k\b|\b128k\b|\b200k\b|\b272k\b|\b262144\b/.test(lower) || /qwen-long/.test(lower)) {
    buckets.add("long-context");
  }

  if (/(image|audio|realtime|robotics|ocr|pixtral|voxtral|computer-use)/.test(lower)) {
    buckets.add("multimodal");
  }

  if (buckets.size === 1) {
    buckets.add("general-purpose");
  }

  if (buckets.has("frontier")) {
    buckets.add("general-purpose");
  }

  if (buckets.has("agentic-coding")) {
    buckets.add("coding");
  }

  return [...buckets].sort();
}

export function inferReleaseStage(model: string): ModelCatalogEntry["release_stage"] {
  const lower = model.toLowerCase();
  if (/\bpreview\b/.test(lower)) {
    return "preview";
  }

  if (/\bexperimental\b/.test(lower)) {
    return "experimental";
  }

  return "stable";
}

function inferBenchmarkIds(comparisonBuckets: string[]): string[] {
  const ids = new Set<string>(["livebench_overall"]);

  if (comparisonBuckets.includes("coding")) {
    ids.add("livebench_coding");
    ids.add("livecodebench_pass1");
  }

  if (comparisonBuckets.includes("agentic-coding")) {
    ids.add("swe_bench_bash_only");
    ids.add("livebench_agentic_coding");
  }

  if (comparisonBuckets.includes("reasoning")) {
    ids.add("livebench_overall");
  }

  return [...ids].sort();
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
