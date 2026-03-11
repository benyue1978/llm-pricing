const state = {
  allModels: [],
  search: "",
  provider: "all",
  type: "all",
  bucket: "all",
  currency: "USD",
  comparisonView: "raw",
  sortField: "provider",
  sortDirection: "asc",
  selectedPreset: "raw-market",
  updatedAt: null,
  currencyRates: null,
  modelCatalog: new Map(),
  benchmarkSources: new Map(),
  benchmarkDefinitions: new Map(),
  benchmarkScores: new Map()
};

const DEFAULT_STATE = {
  search: "",
  provider: "all",
  type: "all",
  bucket: "all",
  currency: "USD",
  comparisonView: "raw",
  sortField: "provider",
  sortDirection: "asc"
};

const PRESETS = [
  {
    id: "raw-market",
    label: "Market snapshot",
    description: "Raw provider pricing with no benchmark gate. Best for broad price discovery before narrowing the cohort.",
    comparisonView: "raw",
    bucket: "all",
    sortField: "provider",
    sortDirection: "asc",
    minCount: 1
  },
  {
    id: "general-value",
    label: "General value",
    description: "All benchmark-covered text models ranked by input cost per LiveBench point.",
    comparisonView: "livebench_overall",
    bucket: "all",
    sortField: "input_price_per_score",
    sortDirection: "asc",
    minCount: 12
  },
  {
    id: "frontier-value",
    label: "Frontier value",
    description: "Flagship models ranked on broad capability using LiveBench overall.",
    comparisonView: "livebench_overall",
    bucket: "frontier",
    sortField: "input_price_per_score",
    sortDirection: "asc",
    minCount: 12
  },
  {
    id: "coding-value",
    label: "Coding value",
    description: "Broad coding-capable cohort ranked by input cost per LiveBench Coding point.",
    comparisonView: "livebench_coding",
    bucket: "all",
    sortField: "input_price_per_score",
    sortDirection: "asc",
    minCount: 12
  },
  {
    id: "agentic-coding",
    label: "Agentic coding",
    description: "Broad agentic coding cohort ranked by input cost per LiveBench Agentic Coding point.",
    comparisonView: "livebench_agentic_coding",
    bucket: "all",
    sortField: "input_price_per_score",
    sortDirection: "asc",
    minCount: 12
  },
  {
    id: "strict-code",
    label: "Strict code eval",
    description: "Models with official LiveCodeBench coverage, ranked by input cost per pass@1 point.",
    comparisonView: "livecodebench_pass1",
    bucket: "all",
    sortField: "input_price_per_score",
    sortDirection: "asc",
    minCount: 10
  },
  {
    id: "strict-agent",
    label: "Strict agent eval",
    description: "Models with official SWE-bench bash-only coverage, ranked by input cost per resolved-rate point.",
    comparisonView: "swe_bench_bash_only",
    bucket: "all",
    sortField: "input_price_per_score",
    sortDirection: "asc",
    minCount: 10
  },
  {
    id: "budget-models",
    label: "Budget models",
    description: "Low-cost models, sorted by raw converted input price.",
    comparisonView: "raw",
    bucket: "low-cost",
    sortField: "input_price_per_million",
    sortDirection: "asc",
    minCount: 12
  }
];

const elements = {
  updatedAt: document.getElementById("updated-at"),
  resultCount: document.getElementById("result-count"),
  errorBanner: document.getElementById("error-banner"),
  statsGrid: document.getElementById("stats-grid"),
  emptyState: document.getElementById("empty-state"),
  pricingTable: document.getElementById("pricing-table"),
  searchInput: document.getElementById("search-input"),
  providerFilter: document.getElementById("provider-filter"),
  typeFilter: document.getElementById("type-filter"),
  bucketFilter: document.getElementById("bucket-filter"),
  comparisonView: document.getElementById("comparison-view"),
  currencyFilter: document.getElementById("currency-filter"),
  sortField: document.getElementById("sort-field"),
  sortDirection: document.getElementById("sort-direction"),
  resetFilters: document.getElementById("reset-filters"),
  tableNote: document.getElementById("table-note"),
  presetGrid: document.getElementById("preset-grid"),
  benchmarkPanel: document.getElementById("benchmark-panel"),
  benchmarkTitle: document.getElementById("benchmark-title"),
  benchmarkSummary: document.getElementById("benchmark-summary"),
  benchmarkMetric: document.getElementById("benchmark-metric"),
  benchmarkNotes: document.getElementById("benchmark-notes"),
  benchmarkMaintainer: document.getElementById("benchmark-maintainer"),
  benchmarkCoverage: document.getElementById("benchmark-coverage"),
  benchmarkSourceLink: document.getElementById("benchmark-source-link"),
  benchmarkDocsLink: document.getElementById("benchmark-docs-link")
};

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function modelKey(provider, model) {
  return `${provider}::${model}`;
}

function benchmarkKey(provider, model, benchmarkId) {
  return `${provider}::${model}::${benchmarkId}`;
}

function buildModelUrl(provider, model) {
  const params = new URLSearchParams({ provider, model });
  return `/model.html#${params.toString()}`;
}

function formatPrice(value, currency) {
  if (value == null) return "–";
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 0,
    maximumFractionDigits: value < 1 ? 3 : 2
  });
  return formatter.format(value).replace(/\u00a0/g, " ");
}

function formatScore(value) {
  if (value == null) return "–";
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function convertPrice(value, fromCurrency, toCurrency) {
  if (value == null) return null;
  if (fromCurrency === toCurrency) return value;

  const fromRate = state.currencyRates?.rates?.[fromCurrency];
  const toRate = state.currencyRates?.rates?.[toCurrency];
  if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || !fromRate || !toRate) {
    return null;
  }

  const amountInBase = value / fromRate;
  const converted = amountInBase * toRate;
  return Number.isFinite(converted) ? converted : null;
}

function formatUpdatedAt(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function setOptions(select, values, allLabel) {
  const previous = select.value;
  select.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = allLabel;
  select.appendChild(allOption);

  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }

  select.value = values.includes(previous) ? previous : "all";
}

function applyUrlState() {
  const params = new URLSearchParams(window.location.search);
  state.search = params.get("q") ?? DEFAULT_STATE.search;
  state.provider = params.get("provider") ?? DEFAULT_STATE.provider;
  state.type = params.get("type") ?? DEFAULT_STATE.type;
  state.bucket = params.get("bucket") ?? DEFAULT_STATE.bucket;
  state.currency = params.get("currency") ?? DEFAULT_STATE.currency;
  state.comparisonView = params.get("view") ?? DEFAULT_STATE.comparisonView;
  state.sortField = params.get("sort") ?? DEFAULT_STATE.sortField;
  state.sortDirection = params.get("dir") === "desc" ? "desc" : DEFAULT_STATE.sortDirection;
}

function syncUrlState() {
  const params = new URLSearchParams();
  if (state.search !== DEFAULT_STATE.search) params.set("q", state.search);
  if (state.provider !== DEFAULT_STATE.provider) params.set("provider", state.provider);
  if (state.type !== DEFAULT_STATE.type) params.set("type", state.type);
  if (state.bucket !== DEFAULT_STATE.bucket) params.set("bucket", state.bucket);
  if (state.currency !== DEFAULT_STATE.currency) params.set("currency", state.currency);
  if (state.comparisonView !== DEFAULT_STATE.comparisonView) params.set("view", state.comparisonView);
  if (state.sortField !== DEFAULT_STATE.sortField) params.set("sort", state.sortField);
  if (state.sortDirection !== DEFAULT_STATE.sortDirection) params.set("dir", state.sortDirection);

  const next = params.toString();
  const current = window.location.search.startsWith("?") ? window.location.search.slice(1) : window.location.search;
  if (next !== current) {
    const url = `${window.location.pathname}${next ? `?${next}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }
}

function hydrateFilters(models) {
  setOptions(elements.providerFilter, [...new Set(models.map((model) => model.provider))].sort(), "All providers");
  setOptions(elements.typeFilter, [...new Set(models.map((model) => model.type))].sort(), "All types");
  const buckets = [...new Set(models.flatMap((model) => model.comparisonBuckets))].filter(Boolean).sort();
  setOptions(elements.bucketFilter, buckets, "All buckets");
}

function matchesFilters(model, { includeSearch = true } = {}) {
  const query = normalizeText(state.search);
  if (state.provider !== "all" && model.provider !== state.provider) return false;
  if (state.type !== "all" && model.type !== state.type) return false;
  if (state.bucket !== "all" && !model.comparisonBuckets.includes(state.bucket)) return false;
  if (state.comparisonView !== "raw" && !Number.isFinite(model.benchmarkScore)) return false;
  if (!includeSearch || !query) return true;

  const haystack = [
    model.provider,
    model.model,
    model.type,
    model.currency,
    model.source,
    ...(model.comparisonBuckets ?? []),
    state.benchmarkDefinitions.get(state.comparisonView)?.name ?? ""
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function getEnrichedModels() {
  return state.allModels.map((model) => {
    const metadata = state.modelCatalog.get(modelKey(model.provider, model.model)) ?? null;
    const benchmark = state.comparisonView === "raw"
      ? null
      : state.benchmarkScores.get(benchmarkKey(model.provider, model.model, state.comparisonView)) ?? null;
    const convertedInput = convertPrice(model.input_price_per_million, model.currency, state.currency);
    const convertedOutput = convertPrice(model.output_price_per_million, model.currency, state.currency);
    const score = benchmark?.score ?? null;
    const inputPerScore = Number.isFinite(convertedInput) && Number.isFinite(score) && score > 0
      ? convertedInput / score
      : null;
    const outputPerScore = Number.isFinite(convertedOutput) && Number.isFinite(score) && score > 0
      ? convertedOutput / score
      : null;

    return {
      ...model,
      comparisonBuckets: metadata?.comparison_buckets ?? [],
      benchmark,
      benchmarkScore: score,
      convertedInput,
      convertedOutput,
      inputPerScore,
      outputPerScore
    };
  });
}

function getVisibleModels() {
  const filtered = getEnrichedModels().filter((model) => matchesFilters(model));

  const direction = state.sortDirection === "asc" ? 1 : -1;
  filtered.sort((left, right) => compareModels(left, right, state.sortField) * direction);
  return filtered;
}

function getPresetCount(preset) {
  return getEnrichedModels().filter((model) => {
    if (preset.bucket !== "all" && !model.comparisonBuckets.includes(preset.bucket)) {
      return false;
    }
    if (preset.comparisonView !== "raw") {
      const score = state.benchmarkScores.get(benchmarkKey(model.provider, model.model, preset.comparisonView));
      return Number.isFinite(score?.score);
    }
    return true;
  }).length;
}

function getVisiblePresets() {
  return PRESETS.filter((preset) => getPresetCount(preset) >= (preset.minCount ?? 1));
}

function compareModels(left, right, field) {
  if (field === "input_price_per_million") {
    return compareNumbers(left.convertedInput, right.convertedInput) || compareModels(left, right, "provider");
  }

  if (field === "output_price_per_million") {
    return compareNumbers(left.convertedOutput, right.convertedOutput) || compareModels(left, right, "provider");
  }

  if (field === "benchmark_score") {
    return compareNumbers(left.benchmarkScore, right.benchmarkScore, true) || compareModels(left, right, "provider");
  }

  if (field === "input_price_per_score") {
    return compareNumbers(left.inputPerScore, right.inputPerScore) || compareModels(left, right, "provider");
  }

  if (field === "output_price_per_score") {
    return compareNumbers(left.outputPerScore, right.outputPerScore) || compareModels(left, right, "provider");
  }

  const a = normalizeText(left[field]);
  const b = normalizeText(right[field]);
  return a.localeCompare(b) || normalizeText(left.model).localeCompare(normalizeText(right.model));
}

function compareNumbers(a, b, descendingMissing = false) {
  const fallback = descendingMissing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  const left = Number.isFinite(a) ? a : fallback;
  const right = Number.isFinite(b) ? b : fallback;
  return left - right;
}

function renderStats(models) {
  const providerCount = new Set(models.map((model) => model.provider)).size;
  const bucketCount = new Set(models.flatMap((model) => model.comparisonBuckets)).size;
  const efficiencyWinner = state.comparisonView === "raw"
    ? models
      .filter((model) => Number.isFinite(model.convertedInput))
      .slice()
      .sort((left, right) => left.convertedInput - right.convertedInput)[0]
    : models
      .filter((model) => Number.isFinite(model.inputPerScore))
      .slice()
      .sort((left, right) => left.inputPerScore - right.inputPerScore)[0];

  const benchmarkLabel = state.comparisonView === "raw"
    ? "Lowest input"
    : "Best input / score";
  const benchmarkValue = !efficiencyWinner
    ? "–"
    : state.comparisonView === "raw"
      ? formatPrice(efficiencyWinner.convertedInput, state.currency)
      : `${formatPrice(efficiencyWinner.inputPerScore, state.currency)} / pt`;
  const benchmarkDetail = efficiencyWinner
    ? `${efficiencyWinner.provider} / ${efficiencyWinner.model}`
    : "No visible models.";

  const stats = [
    {
      label: "Visible models",
      value: `${models.length}`,
      detail: "Current result set after search, filters, and comparison mode."
    },
    {
      label: "Providers",
      value: `${providerCount}`,
      detail: "Unique vendors represented in the current view."
    },
    {
      label: "Buckets",
      value: `${bucketCount}`,
      detail: "Comparison-safe groups drawn from the model metadata registry."
    },
    {
      label: benchmarkLabel,
      value: benchmarkValue,
      detail: benchmarkDetail
    }
  ];

  elements.statsGrid.innerHTML = "";
  for (const stat of stats) {
    const card = document.createElement("article");
    card.className = "stat-card";
    card.innerHTML = `
      <span class="meta-label">${escapeHtml(stat.label)}</span>
      <strong>${escapeHtml(stat.value)}</strong>
      <p>${escapeHtml(stat.detail)}</p>
    `;
    elements.statsGrid.appendChild(card);
  }
}

function renderBenchmarkPanel(models) {
  if (state.comparisonView === "raw") {
    elements.benchmarkPanel.hidden = true;
    return;
  }

  const definition = state.benchmarkDefinitions.get(state.comparisonView);
  if (!definition) {
    elements.benchmarkPanel.hidden = true;
    return;
  }

  const benchmarkResults = models
    .map((model) => model.benchmark)
    .filter(Boolean);
  const datedResults = benchmarkResults
    .map((entry) => entry.evaluated_at)
    .filter(Boolean)
    .sort();
  const visibleSourceRows = new Set(
    benchmarkResults.flatMap((entry) => entry.matched_benchmark_models ?? []).filter(Boolean)
  ).size;
  const benchmarkSource = state.benchmarkSources.get(definition.source_url) ?? null;

  elements.benchmarkPanel.hidden = false;
  elements.benchmarkTitle.textContent = definition.name;
  elements.benchmarkSummary.textContent = `${models.length} visible models are being compared using ${definition.maintainer}. Click any model for exact matched rows and per-model provenance.`;
  elements.benchmarkMetric.textContent = definition.metric_name;
  elements.benchmarkNotes.textContent = definition.notes;
  elements.benchmarkMaintainer.textContent = benchmarkSource?.name ?? definition.maintainer;
  elements.benchmarkCoverage.textContent = datedResults.length
    ? `Visible rows map to ${visibleSourceRows} official benchmark entries. Latest evaluation date in view: ${datedResults[datedResults.length - 1]}.`
    : "No dated benchmark rows are visible in the current result set.";
  elements.benchmarkSourceLink.href = definition.source_url;
  elements.benchmarkDocsLink.href = definition.docs_url;
}

function renderPresets() {
  const presets = getVisiblePresets();
  elements.presetGrid.innerHTML = presets.map((preset) => {
    const definition = state.benchmarkDefinitions.get(preset.comparisonView);
    const subtitle = preset.comparisonView === "raw"
      ? "Raw pricing"
      : `${definition?.name ?? preset.comparisonView} • ${preset.bucket === "all" ? "All buckets" : preset.bucket}`;

    return `
      <button
        class="preset-card${state.selectedPreset === preset.id ? " is-active" : ""}"
        type="button"
        data-preset-id="${preset.id}"
      >
        <span class="meta-label">${escapeHtml(subtitle)}</span>
        <strong>${escapeHtml(preset.label)}</strong>
        <p>${escapeHtml(preset.description)}</p>
        <span class="preset-meta">${getPresetCount(preset)} comparable models</span>
      </button>
    `;
  }).join("");

  for (const button of elements.presetGrid.querySelectorAll("[data-preset-id]")) {
    button.addEventListener("click", () => {
      applyPreset(button.getAttribute("data-preset-id"));
    });
  }
}

function updateControlValues() {
  elements.searchInput.value = state.search;
  elements.providerFilter.value = state.provider;
  elements.typeFilter.value = state.type;
  elements.bucketFilter.value = state.bucket;
  elements.currencyFilter.value = state.currency;
  elements.comparisonView.value = state.comparisonView;
  elements.sortField.value = state.sortField;
}

function syncSelectedPreset() {
  const preset = PRESETS.find((item) =>
    item.comparisonView === state.comparisonView &&
    item.bucket === state.bucket &&
    item.sortField === state.sortField &&
    item.sortDirection === state.sortDirection
  );
  state.selectedPreset = preset?.id ?? "custom";
}

function applyPreset(presetId) {
  const preset = PRESETS.find((entry) => entry.id === presetId);
  if (!preset) {
    return;
  }

  state.provider = "all";
  state.type = "all";
  state.search = "";
  state.bucket = preset.bucket;
  state.comparisonView = preset.comparisonView;
  state.sortField = preset.sortField;
  state.sortDirection = preset.sortDirection;
  state.selectedPreset = preset.id;

  elements.searchInput.value = "";
  updateControlValues();
  render();
}

function renderTable(models) {
  if (!models.length) {
    elements.emptyState.hidden = false;
    elements.emptyState.textContent = state.comparisonView === "raw"
      ? "No models match the current search and filter state."
      : "No models in the current view have a score for the selected benchmark.";
    elements.pricingTable.innerHTML = "";
    return;
  }

  elements.emptyState.hidden = true;

  const benchmarkMode = state.comparisonView !== "raw";
  const benchmarkDefinition = state.benchmarkDefinitions.get(state.comparisonView) ?? null;
  elements.tableNote.textContent = benchmarkMode
    ? `${benchmarkDefinition?.name ?? "Benchmark"} is shown as an official-source score. Price / score is benchmark-specific, not a universal quality ranking.`
    : "Prices are listed per 1M tokens in each model’s native currency.";

  const benchmarkColumns = benchmarkMode
    ? `
        <th>Bucket</th>
        <th>Score</th>
        <th>Input / score</th>
        <th>Output / score</th>
      `
    : "<th>Bucket</th>";

  const tableHead = `
    <thead>
      <tr>
        <th>Provider</th>
        <th>Model</th>
        <th>Type</th>
        <th>Native</th>
        ${benchmarkColumns}
        <th>Input / 1M</th>
        <th>Output / 1M</th>
        <th>Source</th>
      </tr>
    </thead>
  `;

  const rows = models
    .map((model) => {
      const modelUrl = buildModelUrl(model.provider, model.model);
      const sourceLink = model.source
        ? `<a class="source-link" href="${escapeHtml(model.source)}" target="_blank" rel="noreferrer">Official page</a>`
        : "–";
      const bucketMarkup = (model.comparisonBuckets ?? [])
        .slice(0, 2)
        .map((bucket) => `<span class="bucket-pill">${escapeHtml(bucket)}</span>`)
        .join("");
      const scoreTrace = model.benchmark
        ? `
            <div class="trace-links">
              <a class="source-link" href="${escapeHtml(model.benchmark.source_url)}" target="_blank" rel="noreferrer">Score source</a>
              <a class="source-link" href="${escapeHtml(`${modelUrl}&section=benchmark-trace`)}">Trace</a>
            </div>
          `
        : "";
      const benchmarkCells = benchmarkMode
        ? `
            <td data-label="Bucket">${bucketMarkup || "–"}</td>
            <td data-label="Score" class="price-cell">
              ${formatScore(model.benchmarkScore)}
              ${scoreTrace}
            </td>
            <td data-label="Input / score" class="price-cell">${model.inputPerScore == null ? "–" : `${formatPrice(model.inputPerScore, state.currency)} / pt`}</td>
            <td data-label="Output / score" class="price-cell">${model.outputPerScore == null ? "–" : `${formatPrice(model.outputPerScore, state.currency)} / pt`}</td>
          `
        : `<td data-label="Bucket">${bucketMarkup || "–"}</td>`;

      return `
        <tr>
          <td data-label="Provider"><span class="provider-pill">${escapeHtml(model.provider)}</span></td>
          <td data-label="Model" class="model-cell">
            <a class="model-link" href="${escapeHtml(modelUrl)}">${escapeHtml(model.model)}</a>
          </td>
          <td data-label="Type"><span class="type-pill">${escapeHtml(model.type)}</span></td>
          <td data-label="Native"><span class="currency-pill">${escapeHtml(model.currency)}</span></td>
          ${benchmarkCells}
          <td data-label="Input" class="price-cell">${formatPrice(model.convertedInput, state.currency)}</td>
          <td data-label="Output" class="price-cell">${formatPrice(model.convertedOutput, state.currency)}</td>
          <td data-label="Source">${sourceLink}</td>
        </tr>
      `;
    })
    .join("");

  elements.pricingTable.innerHTML = `${tableHead}<tbody>${rows}</tbody>`;
}

function render() {
  const visibleModels = getVisibleModels();
  const total = state.allModels.length;

  elements.updatedAt.textContent = formatUpdatedAt(state.updatedAt);
  elements.resultCount.textContent = `${visibleModels.length} of ${total} models visible`;
  elements.sortDirection.textContent = `Sort: ${state.sortDirection === "asc" ? "ascending" : "descending"}`;
  elements.sortDirection.setAttribute("aria-pressed", String(state.sortDirection === "desc"));

  syncUrlState();
  syncSelectedPreset();
  renderPresets();
  renderBenchmarkPanel(visibleModels);
  renderStats(visibleModels);
  renderTable(visibleModels);
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    render();
  });

  elements.providerFilter.addEventListener("change", (event) => {
    state.provider = event.target.value;
    render();
  });

  elements.typeFilter.addEventListener("change", (event) => {
    state.type = event.target.value;
    render();
  });

  elements.bucketFilter.addEventListener("change", (event) => {
    state.bucket = event.target.value;
    render();
  });

  elements.comparisonView.addEventListener("change", (event) => {
    state.comparisonView = event.target.value;
    if (state.comparisonView === "raw" && ["benchmark_score", "input_price_per_score", "output_price_per_score"].includes(state.sortField)) {
      state.sortField = "provider";
      elements.sortField.value = "provider";
    }
    render();
  });

  elements.currencyFilter.addEventListener("change", (event) => {
    state.currency = event.target.value;
    render();
  });

  elements.sortField.addEventListener("change", (event) => {
    state.sortField = event.target.value;
    render();
  });

  elements.sortDirection.addEventListener("click", () => {
    state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
    render();
  });

  elements.resetFilters.addEventListener("click", () => {
    Object.assign(state, DEFAULT_STATE);
    updateControlValues();
    render();
  });
}

async function loadPricing() {
  try {
    const [pricingResponse, currencyRateResponse, modelCatalogResponse, benchmarkResponse] = await Promise.all([
      fetch("/data/pricing.json", { cache: "no-store" }),
      fetch("/data/currency_rate.json", { cache: "no-store" }),
      fetch("/data/models.json", { cache: "no-store" }),
      fetch("/data/benchmarks.json", { cache: "no-store" })
    ]);
    if (!pricingResponse.ok) throw new Error(`Failed to load pricing.json: ${pricingResponse.status}`);
    if (!currencyRateResponse.ok) throw new Error(`Failed to load currency_rate.json: ${currencyRateResponse.status}`);
    if (!modelCatalogResponse.ok) throw new Error(`Failed to load models.json: ${modelCatalogResponse.status}`);
    if (!benchmarkResponse.ok) throw new Error(`Failed to load benchmarks.json: ${benchmarkResponse.status}`);

    const [data, currencyRates, modelCatalog, benchmarkRegistry] = await Promise.all([
      pricingResponse.json(),
      currencyRateResponse.json(),
      modelCatalogResponse.json(),
      benchmarkResponse.json()
    ]);
    state.allModels = Array.isArray(data.models) ? data.models : [];
    state.updatedAt = data.updated_at ?? null;
    state.currencyRates = currencyRates ?? null;
    state.modelCatalog = new Map(
      (Array.isArray(modelCatalog.models) ? modelCatalog.models : []).map((entry) => [modelKey(entry.provider, entry.model), entry])
    );
    state.benchmarkDefinitions = new Map(
      (Array.isArray(benchmarkRegistry.benchmarks) ? benchmarkRegistry.benchmarks : []).map((entry) => [entry.id, entry])
    );
    state.benchmarkSources = new Map(
      (Array.isArray(benchmarkRegistry.sources) ? benchmarkRegistry.sources : []).flatMap((entry) => [[entry.id, entry], [entry.url, entry]])
    );
    state.benchmarkScores = new Map(
      (Array.isArray(benchmarkRegistry.results) ? benchmarkRegistry.results : []).map((entry) => [
        benchmarkKey(entry.provider, entry.model, entry.benchmark_id),
        entry
      ])
    );

    applyUrlState();
    hydrateFilters(getEnrichedModels());
    updateControlValues();
    render();
  } catch (error) {
    elements.updatedAt.textContent = "Unavailable";
    elements.resultCount.textContent = "Registry unavailable";
    elements.errorBanner.hidden = false;
    elements.errorBanner.textContent = String(error);
    elements.emptyState.hidden = false;
    elements.emptyState.textContent = "Pricing data could not be loaded.";
  }
}

bindEvents();
loadPricing();
