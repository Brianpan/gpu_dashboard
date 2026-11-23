import {
  adjustedCostPerTask,
  awsRentCostPerHour,
  buildOwnCostPerHour,
  closedModelBlendedCostPer1M,
  costPer1MTokens,
  getThroughput,
  movingAvgPrice,
  rentCostPerHour,
} from "./calc.js";
import { state, notify, type Tab } from "./state.js";
import type { Dataset } from "./types.js";

const GPUS = ["h100", "h200", "b200", "b300"] as const;
const MODELS = ["Qwen3.8", "Qwen3.8 Flash Next"] as const;
const GPU_COUNTS = [1, 2] as const;
const STATES = ["CA", "TX", "NY"] as const;
const YEARS = [3, 5, 7, 10] as const;
const WINDOWS = [3, 5, 7, 14] as const;
const CLOSED_MODELS = ["Fable 5.2", "GPT 6.2"] as const;
const CPUS = ["Intel Xeon Gold 6338 (32-core)", "Intel Xeon Platinum 8592+ (64-core)"] as const;
const MEMORIES = [128, 256, 512, 1024] as const;

const fmtUsd = (n: number, digits = 2) => `$${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

function select<T extends string | number>(label: string, options: readonly T[], current: T): string {
  const id = `sel-${label.replace(/\s+/g, "-")}`;
  return `
    <label class="field">
      <span>${label}</span>
      <select id="${id}">
        ${options.map((o) => `<option value="${o}" ${o === current ? "selected" : ""}>${o}</option>`).join("")}
      </select>
    </label>`;
}

function wireSelect<T extends string | number>(id: string, options: readonly T[], onPick: (v: T) => void) {
  const el = document.getElementById(id) as HTMLSelectElement | null;
  el?.addEventListener("change", () => {
    const raw = el.value;
    const matched = options.find((o) => String(o) === raw)!;
    onPick(matched);
    notify();
  });
}

function tabButton(tab: Tab, label: string): string {
  return `<button class="tab ${state.tab === tab ? "active" : ""}" data-tab="${tab}">${label}</button>`;
}

function metricCards(costPer1M: number, costPerTask: number, taskLabel: string): string {
  return `
    <div class="metrics">
      <div class="metric-card">
        <div class="metric-label">Benchmark cost / 1M tokens</div>
        <div class="metric-value">${fmtUsd(costPer1M, 3)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">${taskLabel}</div>
        <div class="metric-value">${fmtUsd(costPerTask, 4)}</div>
      </div>
    </div>`;
}

function sharedControls(ds: Dataset): string {
  return `
    <div class="controls">
      ${select("GPU type", GPUS, state.gpu)}
      ${select("Model", MODELS, state.model)}
      ${select("GPU count", GPU_COUNTS, state.gpuCount)}
      ${select("Compare vs.", CLOSED_MODELS, state.closedModel)}
    </div>`;
}

function wireSharedControls(): void {
  wireSelect("sel-GPU-type", GPUS, (v) => (state.gpu = v));
  wireSelect("sel-Model", MODELS, (v) => (state.model = v));
  wireSelect("sel-GPU-count", GPU_COUNTS, (v) => (state.gpuCount = v));
  wireSelect("sel-Compare-vs.", CLOSED_MODELS, (v) => (state.closedModel = v));
}

function renderBuildOwn(ds: Dataset): string {
  const throughput = getThroughput(ds, state.model, state.gpu, state.gpuCount);
  const cost = buildOwnCostPerHour(ds, state.gpu, state.gpuCount, state.state, state.years, state.cpu, state.memoryGb);
  const costPer1M = costPer1MTokens(cost.perHour, throughput.tpsTotal);
  const refModel = ds.closedModels.find((m) => m.model === state.closedModel)!;
  const costPerTask = adjustedCostPerTask(costPer1M, refModel);
  const msrp = ds.gpuMsrp.find((r) => r.gpu === state.gpu)!;
  const cpuRow = ds.cpus.find((r) => r.cpu === state.cpu)!;
  const memRow = ds.memory.find((r) => r.capacityGb === state.memoryGb)!;

  return `
    ${metricCards(costPer1M, costPerTask, `Cost / task (adjusted vs ${state.closedModel})`)}
    <div class="panel-controls">
      ${select("Electricity state", STATES, state.state)}
      ${select("Depreciation (yrs)", YEARS, state.years)}
      ${select("CPU", CPUS, state.cpu)}
      ${select("Memory (GB)", MEMORIES, state.memoryGb)}
    </div>
    <div class="detail-grid">
      <div><span>GPU MSRP</span><b>${fmtUsd(msrp.msrpUsd, 0)}</b></div>
      <div><span>GPU TDP</span><b>${msrp.tdpWatts} W x ${state.gpuCount}</b></div>
      <div><span>CPU MSRP</span><b>${fmtUsd(cpuRow.msrpUsd, 0)} (${cpuRow.cores}-core)</b></div>
      <div><span>CPU TDP</span><b>${cpuRow.tdpWatts} W</b></div>
      <div><span>Memory</span><b>${fmtUsd(memRow.totalUsd, 0)} (${memRow.capacityGb} GB @ ${fmtUsd(memRow.pricePerGbUsd)}/GB)</b></div>
      <div><span>Hardware amortization</span><b>${fmtUsd(cost.hardwarePerHour, 4)}/hr</b></div>
      <div><span>Total power draw (GPU + CPU)</span><b>${msrp.tdpWatts * state.gpuCount + cpuRow.tdpWatts} W</b></div>
      <div><span>Electricity (GPU + CPU)</span><b>${fmtUsd(cost.electricityPerHour, 4)}/hr</b></div>
      <div><span>Total compute cost</span><b>${fmtUsd(cost.perHour, 3)}/hr</b></div>
      <div><span>Throughput (tps, total)</span><b>${throughput.tpsTotal.toLocaleString()} tok/s</b></div>
    </div>
    <p class="note">Throughput methodology: ${throughput.methodology}. <a href="${throughput.source}" target="_blank" rel="noopener">source</a></p>
    <p class="note">GPU MSRP/TDP source: <a href="${msrp.source}" target="_blank" rel="noopener">${msrp.source}</a></p>
    <p class="note">CPU source: <a href="${cpuRow.source}" target="_blank" rel="noopener">${cpuRow.source}</a></p>
    <p class="note">Memory source: <a href="${memRow.source}" target="_blank" rel="noopener">${memRow.source}</a></p>`;
}

function renderRentGpu(ds: Dataset): string {
  const throughput = getThroughput(ds, state.model, state.gpu, state.gpuCount);
  const refModel = ds.closedModels.find((m) => m.model === state.closedModel)!;

  const avgPrice = movingAvgPrice(ds.gpuPrices, state.gpu, state.window)!;
  const costPerHour = rentCostPerHour(ds.gpuPrices, state.gpu, state.gpuCount, state.window)!;
  const costPer1M = costPer1MTokens(costPerHour, throughput.tpsTotal);
  const costPerTask = adjustedCostPerTask(costPer1M, refModel);

  const aws = awsRentCostPerHour(ds, state.gpu, state.gpuCount, state.window);
  const awsBlock =
    aws === null
      ? `<p class="note">No AWS listing (on-demand or spot) for ${state.gpu.toUpperCase()} in the underlying
          dataset yet — AWS's Blackwell instances are currently Capacity-Block-only, not standard rental.</p>`
      : (() => {
          const awsCostPer1M = costPer1MTokens(aws.perHour, throughput.tpsTotal);
          const awsCostPerTask = adjustedCostPerTask(awsCostPer1M, refModel);
          return `
            ${metricCards(awsCostPer1M, awsCostPerTask, `Cost / task (adjusted vs ${state.closedModel})`)}
            <div class="detail-grid">
              <div><span>${state.window}-day avg AWS price (${aws.tier})</span><b>${fmtUsd(aws.perHour / state.gpuCount, 3)}/GPU-hr</b></div>
              <div><span>Total AWS cost</span><b>${fmtUsd(aws.perHour, 3)}/hr</b></div>
            </div>`;
        })();

  return `
    <h3>All providers (market average)</h3>
    ${metricCards(costPer1M, costPerTask, `Cost / task (adjusted vs ${state.closedModel})`)}
    <div class="panel-controls">
      ${select("Moving avg window (days)", WINDOWS, state.window)}
    </div>
    <div class="detail-grid">
      <div><span>${state.window}-day avg rental price</span><b>${fmtUsd(avgPrice, 3)}/GPU-hr</b></div>
      <div><span>Total rental cost</span><b>${fmtUsd(costPerHour, 3)}/hr</b></div>
      <div><span>Throughput (tps, total)</span><b>${throughput.tpsTotal.toLocaleString()} tok/s</b></div>
    </div>
    <p class="note">Throughput methodology: ${throughput.methodology}. <a href="${throughput.source}" target="_blank" rel="noopener">source</a></p>
    <p class="note">Rental price source: daily on-demand offers across all providers, averaged from
      <a href="https://github.com/Brianpan/gpu-rental-prices/tree/main/data/snapshots" target="_blank" rel="noopener">Brianpan/gpu-rental-prices</a>,
      preprocessed into <code>data/gpu.csv</code>.</p>

    <h3>AWS only</h3>
    ${awsBlock}
    <p class="note">AWS price source: same
      <a href="https://github.com/Brianpan/gpu-rental-prices/tree/main/data/snapshots" target="_blank" rel="noopener">Brianpan/gpu-rental-prices</a>
      snapshots, filtered to provider "aws" — on-demand offers in <code>data/aws_gpu.csv</code>, spot offers in
      <code>data/spot_aws_gpu.csv</code> as a fallback when on-demand is unavailable for a GPU.</p>`;
}

function renderFrontier(ds: Dataset): string {
  const model = ds.closedModels.find((m) => m.model === state.closedModel)!;
  const blended = closedModelBlendedCostPer1M(model);

  return `
    ${metricCards(blended, model.costPerTask, "Cost / task (as published)")}
    <div class="panel-controls">
      ${select("Closed model", CLOSED_MODELS, state.closedModel)}
    </div>
    <div class="detail-grid">
      <div><span>Input price</span><b>${fmtUsd(model.inputPricePer1M)}/1M</b></div>
      <div><span>Output price</span><b>${fmtUsd(model.outputPricePer1M)}/1M</b></div>
      <div><span>Blended price (4:1 in:out)</span><b>${fmtUsd(blended, 3)}/1M</b></div>
      <div><span>Cost per task (as published)</span><b>${fmtUsd(model.costPerTask, 4)}</b></div>
    </div>
    <p class="note">Source: <a href="${model.source}" target="_blank" rel="noopener">${model.source}</a></p>`;
}

function renderComparisonTable(ds: Dataset): string {
  const refModel = ds.closedModels.find((m) => m.model === state.closedModel)!;
  const throughput = getThroughput(ds, state.model, state.gpu, state.gpuCount);

  const build = buildOwnCostPerHour(ds, state.gpu, state.gpuCount, state.state, state.years, state.cpu, state.memoryGb);
  const buildPer1M = costPer1MTokens(build.perHour, throughput.tpsTotal);

  const rentPerHour = rentCostPerHour(ds.gpuPrices, state.gpu, state.gpuCount, state.window)!;
  const rentPer1M = costPer1MTokens(rentPerHour, throughput.tpsTotal);

  const aws = awsRentCostPerHour(ds, state.gpu, state.gpuCount, state.window);

  const rows = [
    { label: "Build our own", per1M: buildPer1M, perTask: adjustedCostPerTask(buildPer1M, refModel) },
    { label: "Rent the GPU", per1M: rentPer1M, perTask: adjustedCostPerTask(rentPer1M, refModel) },
    ...(aws === null
      ? []
      : (() => {
          const awsPer1M = costPer1MTokens(aws.perHour, throughput.tpsTotal);
          return [
            {
              label: `Rent on AWS (${aws.tier})`,
              per1M: awsPer1M,
              perTask: adjustedCostPerTask(awsPer1M, refModel),
            },
          ];
        })()),
    { label: state.closedModel, per1M: closedModelBlendedCostPer1M(refModel), perTask: refModel.costPerTask },
  ];

  return `
    <h3>Side-by-side: ${state.model} on ${state.gpuCount}x ${state.gpu.toUpperCase()}</h3>
    <table class="compare">
      <thead><tr><th></th><th>$/1M tokens</th><th>$/task</th></tr></thead>
      <tbody>
        ${rows.map((r) => `<tr><td>${r.label}</td><td>${fmtUsd(r.per1M, 3)}</td><td>${fmtUsd(r.perTask, 4)}</td></tr>`).join("")}
      </tbody>
    </table>`;
}

export function render(root: HTMLElement, ds: Dataset): void {
  const panel =
    state.tab === "build" ? renderBuildOwn(ds) : state.tab === "rent" ? renderRentGpu(ds) : renderFrontier(ds);

  root.innerHTML = `
    <header>
      <h1>GPU Economics Battle Test</h1>
      <p class="subtitle">Build our own vs. rent a neo-cloud GPU vs. a frontier closed model</p>
    </header>
    <section class="comparison">${renderComparisonTable(ds)}</section>
    <nav class="tabs">
      ${tabButton("build", "Build our own server")}
      ${tabButton("rent", "Rent the GPU")}
      ${tabButton("frontier", "Frontier model")}
    </nav>
    ${state.tab !== "frontier" ? sharedControls(ds) : ""}
    <section class="panel">${panel}</section>
  `;

  root.querySelectorAll<HTMLButtonElement>("button.tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.tab = btn.dataset.tab as Tab;
      notify();
    });
  });

  if (state.tab !== "frontier") {
    wireSharedControls();
  }
  if (state.tab === "build") {
    wireSelect("sel-Electricity-state", STATES, (v) => (state.state = v));
    wireSelect("sel-Depreciation-(yrs)", YEARS, (v) => (state.years = v));
    wireSelect("sel-CPU", CPUS, (v) => (state.cpu = v));
    wireSelect("sel-Memory-(GB)", MEMORIES, (v) => (state.memoryGb = v));
  }
  if (state.tab === "rent") {
    wireSelect("sel-Moving-avg-window-(days)", WINDOWS, (v) => (state.window = v));
  }
  if (state.tab === "frontier") {
    wireSelect("sel-Closed-model", CLOSED_MODELS, (v) => (state.closedModel = v));
  }
}
