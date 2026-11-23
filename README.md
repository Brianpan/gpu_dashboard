# GPU Economics Battle Test

A single-page dashboard (vanilla TypeScript, no framework) comparing three ways to run
inference — **build your own server**, **rent a neo-cloud GPU**, or **pay a frontier closed
model** — on cost per 1M tokens and cost per task.

## Running it

The compiled app ships in `dist/` so it runs with no build step:

```bash
npm run serve   # python3 -m http.server 8080
# open http://localhost:8080
```

To edit the TypeScript source in `src/` and rebuild:

```bash
npm install
npm run build   # tsc -> dist/
```

## Data sources by GPU type

All raw and preprocessed data lives in `data/`. Every number in the UI links back to its
source; this table is the same mapping, grouped by GPU.

| GPU | Throughput (tps, 16 concurrent) | Rental price | MSRP / TDP |
|---|---|---|---|
| **H100** | [InferenceX (SemiAnalysis)](https://inferencex.semianalysis.com/run/qwen-3-8-flash-next-on-h100) — FP8, interactivity-sweep operating point (no public fixed-concurrency=16 NVFP4 run exists; SGLang docs mark H100 as untested for native NVFP4 MoE kernels) | [Brianpan/gpu-rental-prices](https://github.com/Brianpan/gpu-rental-prices/tree/main/data/snapshots) daily snapshots, on-demand offers | [intuitionlabs.ai GPU pricing guide](https://intuitionlabs.ai/articles/nvidia-ai-gpu-pricing-guide) |
| **H200** | [InferenceX (SemiAnalysis)](https://inferencex.semianalysis.com/run/qwen-3-8-flash-next-on-h200) — FP8, interactivity-sweep operating point; Qwen3.8 (27B) number is a **measured** value from [sglang issue #42024](https://github.com/sgl-project/sglang/issues/42024), concurrency=16, low-latency, no speculative decoding | same as above | same as above |
| **B200** | [sglang issue #41919](https://github.com/sgl-project/sglang/issues/41919) — "[Cookbook Benchmark] Qwen3.8-Flash-Next NVFP4 on B200 (TP1)", **measured** concurrency=16, low-latency strategy | same as above | same as above |
| **B300** | [sglang issue #41937](https://github.com/sgl-project/sglang/issues/41937) — "[Cookbook Benchmark] Qwen3.8-Flash-Next NVFP4 on B300 (TP1)", **measured** concurrency=16, low-latency strategy | same as above | same as above |

Full per-row methodology (which number came from where, and which are estimated) is in
`data/throughput.csv`'s `methodology` column, and is also rendered under the metric cards in
the app itself.

### Why some numbers are estimated, not measured

SGLang's GitHub "Cookbook Benchmark" issues only exist for **B200** and **B300** running
Qwen3.8-Flash-Next in NVFP4 — Blackwell is the only generation with native NVFP4 MoE kernels,
so no equivalent concurrency=16 benchmark issue exists for H100/H200 on that model. For those
two GPUs we use the closest public, real measurement: SemiAnalysis's
[InferenceX](https://inferencex.semianalysis.com) FP8 runs, reported at their nearest
published interactivity operating point rather than a literal concurrency=16 sweep.

For the dense **Qwen3.8 (27B)** model, only an H200 benchmark is public
([sglang #42024](https://github.com/sgl-project/sglang/issues/42024)). H100/B200/B300 rows for
that model are **estimated**: we take the measured Qwen3.8-Flash-Next throughput ratio between
each GPU and H100, and apply that same ratio to the real Qwen3.8 H200 number. This is flagged
in the `methodology` column as `estimated: scaled from measured H200 value using the <gpu>/h100
Qwen3.8-Flash-Next throughput ratio`.

2-GPU rows apply a documented (not separately measured) **93% NVLink TP2 scaling efficiency**
assumption to the 1-GPU per-GPU tps.

## Data pipeline

| File | What it is | Built from |
|---|---|---|
| `data/throughput.csv` | tps at 16 concurrent requests, per GPU / model / GPU count | GitHub issues + InferenceX, see table above |
| `data/gpu.csv` | daily average on-demand `$/GPU-hr` rental price, by GPU and date | [Brianpan/gpu-rental-prices](https://github.com/Brianpan/gpu-rental-prices) daily JSON snapshots, averaged across all on-demand offers for that GPU/day (`h100-sxm`/`h100-nvl`/`h100-pcie` folded into `h100`, same for `h200-nvl`) |
| `data/gpu_msrp.csv` | GPU MSRP (street price) and TDP | [intuitionlabs.ai](https://intuitionlabs.ai/articles/nvidia-ai-gpu-pricing-guide) (price), public NVIDIA spec sheets / DCIM power references (TDP) |
| `data/electricity.csv` | commercial $/kWh for CA, TX, NY | [electricchoice.com/electricity-prices-by-state](https://www.electricchoice.com/electricity-prices-by-state/) |
| `data/closed_models.csv` | $/1M input, $/1M output, $/task | [artificialanalysis.ai/leaderboards/models](https://artificialanalysis.ai/leaderboards/models) |
| `data/cpu.csv` | host CPU cores, TDP, MSRP for the "Build our own" selector | [Intel ARK product specification pages](https://www.intel.com/content/www/us/en/products/sku/212285/intel-xeon-gold-6338-processor-48m-cache-2-00-ghz/specifications.html) — 32-core: Xeon Gold 6338 ($2,990 RCP, 205W); 64-core: [Xeon Platinum 8592+](https://www.intel.com/content/www/us/en/products/sku/237261/intel-xeon-platinum-8592-processor-320m-cache-1-90-ghz/specifications.html) ($11,600 RCP, 350W) |
| `data/memory.csv` | total system memory cost for 128/256/512/1024GB tiers | [datacenterdisk.com DDR5 ECC RDIMM market report](https://datacenterdisk.com/reports/server-ram-market-report-2026) — flat $41.87/GB median applied uniformly across tiers (real per-GB pricing varies by module size/scarcity; this is a simplifying assumption, noted here rather than sourcing four separate kit quotes) |
| `data/aws_gpu.csv` | daily average AWS **on-demand** `$/GPU-hr`, by GPU and date | same [Brianpan/gpu-rental-prices](https://github.com/Brianpan/gpu-rental-prices) snapshots as `gpu.csv`, filtered to `provider == "aws"` |
| `data/spot_aws_gpu.csv` | daily average AWS **spot** `$/GPU-hr`, by GPU and date | same snapshots, filtered to `provider == "aws"` and `kind == "spot"` — used as a fallback when a GPU has no AWS on-demand listing |

The "Rent the GPU" panel lets you pick a **3 / 5 / 7 / 14-day moving average** window over
`data/gpu.csv`'s daily averages, so the rental price reacts to recent market moves instead of
a single day's snapshot. The panel shows two blocks: **"All providers (market average)"**
(the original `gpu.csv`-based number, blending every provider in the dataset) and **"AWS
only"** (same moving-average math, restricted to AWS). AWS does not have on-demand *or* spot
listings for B200/B300 anywhere in the underlying dataset — those are Capacity-Block-only on
AWS today — so the AWS block shows a "not available" note for those two GPUs instead of a
number, rather than silently reusing a different provider's price.

## Cost model

- **Build our own**: `$/hr = (GPU MSRP × gpu_count + CPU MSRP + memory total) / (depreciation_years × 365 × 24)
  + ((GPU TDP_kW × gpu_count + CPU TDP_kW) × $/kWh)`. CPU and memory are host-level (one per
  server, not multiplied by `gpu_count`); memory's own power draw is excluded since no
  reliable public per-DIMM wattage figure exists and it is small next to GPU/CPU draw.
- **Rent the GPU**: `$/hr = moving_avg($/GPU-hr, window) × gpu_count`, computed once against
  `gpu.csv` (all providers) and once against `aws_gpu.csv`/`spot_aws_gpu.csv` (AWS only, spot
  as fallback).
- Both convert to `$/1M tokens` via `$/hr ÷ (tps_total × 3600) × 1,000,000`, where `tps_total`
  is the combined (input+output) tokens/sec for the selected GPU/model/GPU-count row.
- **Cost per task (adjusted)**: a closed model's published cost-per-task is re-priced at our
  hardware's token economics: `adjusted = (our $/1M ÷ closed_model blended $/1M) × closed_model cost_per_task`.
  The closed model's blended $/1M assumes a 4:1 input:output token ratio (typical for agentic
  coding workloads).

## Project structure

```
index.html            entry page
src/*.ts               TypeScript source (types, csv parsing, data loading, calc, state, view)
dist/*.js              compiled output actually loaded by index.html
data/*.csv             datasets described above
```
