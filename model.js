const elements = {
  title: document.getElementById("detail-title"),
  subtitle: document.getElementById("detail-subtitle"),
  provider: document.getElementById("detail-provider"),
  family: document.getElementById("detail-family"),
  updatedAt: document.getElementById("detail-updated-at"),
  error: document.getElementById("detail-error"),
  pricingCards: document.getElementById("pricing-cards"),
  metadataGrid: document.getElementById("metadata-grid"),
  benchmarkCards: document.getElementById("benchmark-cards"),
  sourceGrid: document.getElementById("source-grid")
};

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

function convertPrice(value, fromCurrency, toCurrency, rates) {
  if (value == null) return null;
  if (fromCurrency === toCurrency) return value;
  const fromRate = rates?.[fromCurrency];
  const toRate = rates?.[toCurrency];
  if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || !fromRate || !toRate) {
    return null;
  }
  const amountInBase = value / fromRate;
  const converted = amountInBase * toRate;
  return Number.isFinite(converted) ? converted : null;
}

function renderCardGrid(container, cards) {
  container.innerHTML = cards.map((card) => `
    <article class="detail-card${card.className ? ` ${card.className}` : ""}">
      <span class="meta-label">${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(card.value)}</strong>
      <p>${escapeHtml(card.detail)}</p>
      ${card.extra ?? ""}
    </article>
  `).join("");
}

function sourceLink(url, label) {
  return url
    ? `<a class="source-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`
    : "–";
}

function renderSourceValue(value) {
  return value
    ? `<span class="detail-url" title="${escapeHtml(value)}">${escapeHtml(value)}</span>`
    : "–";
}

async function loadModelDetail() {
  const paramSource = window.location.search || (window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "");
  const params = new URLSearchParams(paramSource);
  const provider = params.get("provider");
  const modelName = params.get("model");

  if (!provider || !modelName) {
    throw new Error("Model detail URL is missing provider or model query parameters.");
  }

  const [pricingResponse, currencyRateResponse, modelCatalogResponse, benchmarkResponse] = await Promise.all([
    fetch("/data/pricing.json", { cache: "no-store" }),
    fetch("/data/currency_rate.json", { cache: "no-store" }),
    fetch("/data/models.json", { cache: "no-store" }),
    fetch("/data/benchmarks.json", { cache: "no-store" })
  ]);

  if (!pricingResponse.ok || !currencyRateResponse.ok || !modelCatalogResponse.ok || !benchmarkResponse.ok) {
    throw new Error("One or more data artifacts could not be loaded.");
  }

  const [pricingRegistry, currencyRegistry, modelCatalog, benchmarkRegistry] = await Promise.all([
    pricingResponse.json(),
    currencyRateResponse.json(),
    modelCatalogResponse.json(),
    benchmarkResponse.json()
  ]);

  const pricingModel = (pricingRegistry.models ?? []).find((entry) => entry.provider === provider && entry.model === modelName);
  if (!pricingModel) {
    throw new Error(`Model not found in pricing registry: ${provider} / ${modelName}`);
  }

  const metadata = (modelCatalog.models ?? []).find((entry) => entry.provider === provider && entry.model === modelName) ?? null;
  const metadataSources = new Map((modelCatalog.sources ?? []).map((entry) => [entry.id, entry]));
  const benchmarkDefinitions = new Map((benchmarkRegistry.benchmarks ?? []).map((entry) => [entry.id, entry]));
  const benchmarkResults = (benchmarkRegistry.results ?? [])
    .filter((entry) => entry.provider === provider && entry.model === modelName)
    .sort((left, right) => left.benchmark_id.localeCompare(right.benchmark_id));

  const usdInput = convertPrice(pricingModel.input_price_per_million, pricingModel.currency, "USD", currencyRegistry.rates);
  const usdOutput = convertPrice(pricingModel.output_price_per_million, pricingModel.currency, "USD", currencyRegistry.rates);
  const cnyInput = convertPrice(pricingModel.input_price_per_million, pricingModel.currency, "CNY", currencyRegistry.rates);
  const cnyOutput = convertPrice(pricingModel.output_price_per_million, pricingModel.currency, "CNY", currencyRegistry.rates);

  document.title = `${pricingModel.model} · LLM Pricing Registry`;
  elements.title.textContent = pricingModel.model;
  elements.subtitle.textContent = `Traceability page for ${pricingModel.provider}. Pricing comes from the provider page, metadata comes from the model catalog, and benchmark scores are matched against official benchmark rows.`;
  elements.provider.textContent = pricingModel.provider;
  elements.family.textContent = metadata?.family ?? "Unknown";
  elements.updatedAt.textContent = formatUpdatedAt(pricingRegistry.updated_at);

  renderCardGrid(elements.pricingCards, [
    {
      label: "Native input",
      value: formatPrice(pricingModel.input_price_per_million, pricingModel.currency),
      detail: "Stored exactly as published by the provider for 1M input tokens."
    },
    {
      label: "Native output",
      value: formatPrice(pricingModel.output_price_per_million, pricingModel.currency),
      detail: "Stored exactly as published by the provider for 1M output tokens."
    },
    {
      label: "Converted USD",
      value: `${formatPrice(usdInput, "USD")} / ${formatPrice(usdOutput, "USD")}`,
      detail: `Converted using ECB daily rates from ${currencyRegistry.updated_at?.slice(0, 10) ?? "unknown date"}.`
    },
    {
      label: "Converted CNY",
      value: `${formatPrice(cnyInput, "CNY")} / ${formatPrice(cnyOutput, "CNY")}`,
      detail: `Converted using ECB daily rates from ${currencyRegistry.updated_at?.slice(0, 10) ?? "unknown date"}.`
    }
  ]);

  renderCardGrid(elements.metadataGrid, [
    {
      label: "Buckets",
      value: (metadata?.comparison_buckets ?? []).join(", ") || "–",
      detail: "Cohorts used for safer price comparisons."
    },
    {
      label: "Release stage",
      value: metadata?.release_stage ?? "unknown",
      detail: "Lifecycle signal inferred from provider naming and metadata."
    },
    {
      label: "Access",
      value: `${metadata?.access_type ?? "unknown"} / ${metadata?.openness ?? "unknown"}`,
      detail: "Whether this is an API model, open-weight model, or hosted open-weight model."
    },
    {
      label: "Tracked benchmarks",
      value: (metadata?.benchmark_ids ?? []).join(", ") || "–",
      detail: "Benchmark IDs currently associated with this model in the metadata registry."
    }
  ]);

  if (!benchmarkResults.length) {
    elements.benchmarkCards.innerHTML = `
      <article class="detail-card">
        <span class="meta-label">No benchmark rows</span>
        <strong>–</strong>
        <p>This model does not currently have a matched benchmark score in the official benchmark registry.</p>
      </article>
    `;
  } else {
    elements.benchmarkCards.innerHTML = benchmarkResults.map((entry) => {
      const definition = benchmarkDefinitions.get(entry.benchmark_id);
      const matchedRows = (entry.matched_benchmark_models ?? [])
        .map((row) => `<span class="bucket-pill">${escapeHtml(row)}</span>`)
        .join("");

      return `
        <article class="detail-card">
          <span class="meta-label">${definition?.name ?? entry.benchmark_id}</span>
          <strong>${formatScore(entry.score)} ${entry.score_unit}</strong>
          <p>${definition?.notes ?? "Official benchmark score."}</p>
          <p class="detail-note">Metric: ${definition?.metric_name ?? "–"} · Evaluated: ${entry.evaluated_at ?? "Unknown"}</p>
          <div class="detail-pill-row">${matchedRows || '<span class="bucket-pill">No matched rows recorded</span>'}</div>
          <div class="trace-links">
            ${sourceLink(entry.source_url, "Matched source")}
            ${sourceLink(definition?.docs_url ?? "", "Methodology")}
          </div>
        </article>
      `;
    }).join("");
  }

  const metadataSourceLinks = (metadata?.metadata_source_ids ?? [])
    .map((id) => metadataSources.get(id))
    .filter(Boolean)
    .map((source) => sourceLink(source.url, source.name))
    .join("<br />");

  renderCardGrid(elements.sourceGrid, [
    {
      label: "Pricing source",
      value: "Provider pricing page",
      detail: "Provider page used by the CLI for the pricing entry.",
      extra: `
        <div class="detail-links detail-links-stacked">
          ${renderSourceValue(pricingModel.source)}
          ${sourceLink(pricingModel.source, "Open pricing source")}
        </div>
      `,
      className: "detail-card-source"
    },
    {
      label: "Model metadata source",
      value: "Model metadata page",
      detail: "Canonical page used for the model metadata registry.",
      extra: `
        <div class="detail-links detail-links-stacked">
          ${renderSourceValue(metadata?.model_page_url ?? "")}
          ${sourceLink(metadata?.model_page_url ?? "", "Open model page")}
        </div>
        <div class="detail-links detail-links-stacked">${metadataSourceLinks || "–"}</div>
      `,
      className: "detail-card-source"
    }
  ]);

  if (params.get("section") === "benchmark-trace") {
    document.getElementById("benchmark-trace")?.scrollIntoView({ block: "start" });
  }
}

loadModelDetail().catch((error) => {
  elements.error.hidden = false;
  elements.error.textContent = String(error);
  elements.title.textContent = "Model unavailable";
  elements.subtitle.textContent = "The requested model detail page could not be resolved.";
});
