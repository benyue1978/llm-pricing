function formatPrice(value, currency) {
  if (value == null) return "–";
  const rounded = Number(value.toFixed(4));
  const formatted = rounded.toString();
  return `${currency} ${formatted} / 1M`;
}

function createTable(models) {
  const table = document.createElement("table");
  table.setAttribute("aria-label", "LLM Pricing Table");

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Provider</th>
      <th>Model</th>
      <th>Input $/1M</th>
      <th>Output $/1M</th>
      <th>Source</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const model of models) {
    const tr = document.createElement("tr");

    const tdProvider = document.createElement("td");
    tdProvider.textContent = model.provider;

    const tdModel = document.createElement("td");
    tdModel.textContent = model.model;
    tdModel.className = "model-cell";

    const tdInput = document.createElement("td");
    tdInput.textContent = formatPrice(model.input_price_per_million, model.currency);
    tdInput.className = "price-cell";

    const tdOutput = document.createElement("td");
    tdOutput.textContent = formatPrice(model.output_price_per_million, model.currency);
    tdOutput.className = "price-cell";

    const tdSource = document.createElement("td");
    if (model.source) {
      const link = document.createElement("a");
      link.href = model.source;
      link.textContent = "Pricing page";
      link.target = "_blank";
      link.rel = "noreferrer";
      tdSource.appendChild(link);
    } else {
      tdSource.textContent = "–";
    }

    tr.appendChild(tdProvider);
    tr.appendChild(tdModel);
    tr.appendChild(tdInput);
    tr.appendChild(tdOutput);
    tr.appendChild(tdSource);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  return table;
}

async function loadPricing() {
  const updatedAtEl = document.getElementById("updated-at");
  const tableWrapper = document.getElementById("pricing-table");
  const emptyState = document.getElementById("empty-state");
  const errorBanner = document.getElementById("error-banner");

  try {
    const res = await fetch("/data/pricing.json", { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to load pricing.json: ${res.status}`);
    }
    const data = await res.json();

    const updatedAt = data.updated_at ? new Date(data.updated_at) : null;
    if (updatedAt && !Number.isNaN(updatedAt.getTime())) {
      updatedAtEl.textContent = `Updated at ${updatedAt.toISOString()}`;
    } else {
      updatedAtEl.textContent = "Updated at: unknown";
    }

    const models = Array.isArray(data.models) ? [...data.models] : [];
    if (!models.length) {
      emptyState.textContent = "No pricing data available yet. Run `npx llm-pricing update` to populate registry.";
      tableWrapper.innerHTML = "";
      return;
    }

    models.sort((a, b) => {
      const keyA = `${a.provider}-${a.model}`.toLowerCase();
      const keyB = `${b.provider}-${b.model}`.toLowerCase();
      return keyA.localeCompare(keyB);
    });

    const table = createTable(models);
    tableWrapper.innerHTML = "";
    tableWrapper.appendChild(table);
    emptyState.style.display = "none";
  } catch (error) {
    updatedAtEl.textContent = "Failed to load pricing data.";
    errorBanner.style.display = "block";
    errorBanner.textContent = String(error);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  loadPricing();
});

