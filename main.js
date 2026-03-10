const state = {
  allModels: [],
  search: "",
  provider: "all",
  type: "all",
  currency: "USD",
  sortField: "provider",
  sortDirection: "asc",
  updatedAt: null,
  currencyRates: null
};

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
  currencyFilter: document.getElementById("currency-filter"),
  sortField: document.getElementById("sort-field"),
  sortDirection: document.getElementById("sort-direction"),
  resetFilters: document.getElementById("reset-filters")
};

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function formatPrice(value, currency) {
  if (value == null) return "–";
  return `${currency} ${Number(value).toFixed(value < 1 ? 3 : 2).replace(/\.?0+$/, "")}`;
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

function hydrateFilters(models) {
  setOptions(elements.providerFilter, [...new Set(models.map((model) => model.provider))].sort(), "All providers");
  setOptions(elements.typeFilter, [...new Set(models.map((model) => model.type))].sort(), "All types");
}

function getVisibleModels() {
  const query = normalizeText(state.search);
  const filtered = state.allModels.filter((model) => {
    if (state.provider !== "all" && model.provider !== state.provider) return false;
    if (state.type !== "all" && model.type !== state.type) return false;
    if (!query) return true;

    const haystack = [model.provider, model.model, model.type, model.currency, model.source]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  const direction = state.sortDirection === "asc" ? 1 : -1;
  filtered.sort((left, right) => compareModels(left, right, state.sortField) * direction);
  return filtered;
}

function compareModels(left, right, field) {
  if (field === "input_price_per_million" || field === "output_price_per_million") {
    const a = convertPrice(left[field], left.currency, state.currency) ?? Number.POSITIVE_INFINITY;
    const b = convertPrice(right[field], right.currency, state.currency) ?? Number.POSITIVE_INFINITY;
    return a - b || compareModels(left, right, "provider");
  }

  const a = normalizeText(left[field]);
  const b = normalizeText(right[field]);
  return a.localeCompare(b) || normalizeText(left.model).localeCompare(normalizeText(right.model));
}

function renderStats(models) {
  const providerCount = new Set(models.map((model) => model.provider)).size;
  const currencyCount = new Set(models.map((model) => model.currency)).size;
  const cheapest = models
    .map((model) => ({
      model,
      convertedInput: convertPrice(model.input_price_per_million, model.currency, state.currency)
    }))
    .filter((entry) => Number.isFinite(entry.convertedInput))
    .slice()
    .sort((a, b) => a.convertedInput - b.convertedInput)[0];

  const stats = [
    {
      label: "Visible models",
      value: `${models.length}`,
      detail: "Current result set after search, filters, and sort."
    },
    {
      label: "Providers",
      value: `${providerCount}`,
      detail: "Unique vendors represented in the current view."
    },
    {
      label: "Native currencies",
      value: `${currencyCount}`,
      detail: "Official provider currencies preserved in the source registry."
    },
    {
      label: "Lowest input",
      value: cheapest ? formatPrice(cheapest.convertedInput, state.currency) : "–",
      detail: cheapest ? `${cheapest.model.provider} / ${cheapest.model.model}` : "No visible models."
    }
  ];

  elements.statsGrid.innerHTML = "";
  for (const stat of stats) {
    const card = document.createElement("article");
    card.className = "stat-card";
    card.innerHTML = `
      <span class="meta-label">${stat.label}</span>
      <strong>${stat.value}</strong>
      <p>${stat.detail}</p>
    `;
    elements.statsGrid.appendChild(card);
  }
}

function renderTable(models) {
  if (!models.length) {
    elements.emptyState.hidden = false;
    elements.emptyState.textContent = "No models match the current search and filter state.";
    elements.pricingTable.innerHTML = "";
    return;
  }

  elements.emptyState.hidden = true;
  const tableHead = `
    <thead>
      <tr>
        <th>Provider</th>
        <th>Model</th>
        <th>Type</th>
        <th>Native</th>
        <th>Input / 1M</th>
        <th>Output / 1M</th>
        <th>Source</th>
      </tr>
    </thead>
  `;

  const rows = models
    .map((model) => {
      const sourceLink = model.source
        ? `<a class="source-link" href="${model.source}" target="_blank" rel="noreferrer">Official page</a>`
        : "–";
      const convertedInput = convertPrice(model.input_price_per_million, model.currency, state.currency);
      const convertedOutput = convertPrice(model.output_price_per_million, model.currency, state.currency);

      return `
        <tr>
          <td data-label="Provider"><span class="provider-pill">${model.provider}</span></td>
          <td data-label="Model" class="model-cell">${model.model}</td>
          <td data-label="Type"><span class="type-pill">${model.type}</span></td>
          <td data-label="Native"><span class="currency-pill">${model.currency}</span></td>
          <td data-label="Input" class="price-cell">${formatPrice(convertedInput, state.currency)}</td>
          <td data-label="Output" class="price-cell">${formatPrice(convertedOutput, state.currency)}</td>
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
    state.search = "";
    state.provider = "all";
    state.type = "all";
    state.currency = "USD";
    state.sortField = "provider";
    state.sortDirection = "asc";

    elements.searchInput.value = "";
    elements.providerFilter.value = "all";
    elements.typeFilter.value = "all";
    elements.currencyFilter.value = "USD";
    elements.sortField.value = "provider";
    render();
  });
}

async function loadPricing() {
  try {
    const [pricingResponse, currencyRateResponse] = await Promise.all([
      fetch("/data/pricing.json", { cache: "no-store" }),
      fetch("/data/currency_rate.json", { cache: "no-store" })
    ]);
    if (!pricingResponse.ok) {
      throw new Error(`Failed to load pricing.json: ${pricingResponse.status}`);
    }
    if (!currencyRateResponse.ok) {
      throw new Error(`Failed to load currency_rate.json: ${currencyRateResponse.status}`);
    }

    const [data, currencyRates] = await Promise.all([
      pricingResponse.json(),
      currencyRateResponse.json()
    ]);
    state.allModels = Array.isArray(data.models) ? data.models : [];
    state.updatedAt = data.updated_at ?? null;
    state.currencyRates = currencyRates ?? null;

    hydrateFilters(state.allModels);
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
