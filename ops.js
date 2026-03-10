const elements = {
  updatedAt: document.getElementById("ops-updated-at"),
  runSummary: document.getElementById("ops-run-summary"),
  summary: document.getElementById("ops-summary"),
  errorBanner: document.getElementById("ops-error-banner"),
  emptyState: document.getElementById("ops-empty-state"),
  table: document.getElementById("ops-table")
};

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

function formatDuration(value) {
  if (!Number.isFinite(value)) return "–";
  if (value < 1000) return `${Math.round(value)} ms`;
  return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} s`;
}

function renderSummary(data) {
  const stats = [
    {
      label: "Providers",
      value: `${data.summary?.provider_count ?? 0}`,
      detail: "Total providers attempted in the latest run."
    },
    {
      label: "Live",
      value: `${data.summary?.live_count ?? 0}`,
      detail: "Providers that parsed live official pages."
    },
    {
      label: "Fallback",
      value: `${data.summary?.fallback_count ?? 0}`,
      detail: "Providers that completed with fallback values."
    },
    {
      label: "Failures",
      value: `${data.summary?.failure_count ?? 0}`,
      detail: "Providers that returned no data."
    },
    {
      label: "Models",
      value: `${data.summary?.model_count ?? 0}`,
      detail: "Pricing rows produced by the latest update."
    }
  ];

  elements.summary.innerHTML = "";
  for (const stat of stats) {
    const card = document.createElement("article");
    card.className = "stat-card";
    card.innerHTML = `
      <span class="meta-label">${stat.label}</span>
      <strong>${stat.value}</strong>
      <p>${stat.detail}</p>
    `;
    elements.summary.appendChild(card);
  }
}

function renderTable(providers) {
  if (!providers.length) {
    elements.emptyState.hidden = false;
    elements.emptyState.textContent = "No provider status data is available yet.";
    elements.table.innerHTML = "";
    return;
  }

  elements.emptyState.hidden = true;
  const rows = providers
    .slice()
    .sort((left, right) => left.provider.localeCompare(right.provider))
    .map((provider) => `
      <tr>
        <td data-label="Provider"><span class="provider-pill">${provider.provider}</span></td>
        <td data-label="Mode"><span class="status-pill status-${provider.mode}">${provider.mode}</span></td>
        <td data-label="Success">${provider.success ? "yes" : "no"}</td>
        <td data-label="Models">${provider.model_count}</td>
        <td data-label="Duration">${formatDuration(provider.duration_ms)}</td>
        <td data-label="Checked">${formatUpdatedAt(provider.checked_at)}</td>
        <td data-label="Message" class="ops-message">${provider.message ?? "–"}</td>
        <td data-label="Failure reason" class="ops-message">${provider.fail_reason ?? "–"}</td>
      </tr>
    `)
    .join("");

  elements.table.innerHTML = `
    <thead>
      <tr>
        <th>Provider</th>
        <th>Mode</th>
        <th>Success</th>
        <th>Models</th>
        <th>Duration</th>
        <th>Checked</th>
        <th>Message</th>
        <th>Failure reason</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  `;
}

async function loadOps() {
  try {
    const response = await fetch("/data/ops.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load ops.json: ${response.status}`);
    }

    const data = await response.json();
    const providers = Array.isArray(data.providers) ? data.providers : [];
    elements.updatedAt.textContent = formatUpdatedAt(data.updated_at);
    elements.runSummary.textContent = `${providers.length} providers checked in the latest CLI update`;
    renderSummary(data);
    renderTable(providers);
  } catch (error) {
    elements.updatedAt.textContent = "Unavailable";
    elements.runSummary.textContent = "Ops view unavailable";
    elements.errorBanner.hidden = false;
    elements.errorBanner.textContent = String(error);
    elements.emptyState.hidden = false;
    elements.emptyState.textContent = "Provider ops data could not be loaded.";
  }
}

loadOps();
