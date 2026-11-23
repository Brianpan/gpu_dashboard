import { fetchCsv } from "./csv.js";
import type {
  ClosedModelRow,
  CpuRow,
  Dataset,
  ElectricityRow,
  GpuCount,
  GpuMsrpRow,
  GpuPriceRow,
  GpuType,
  MemoryRow,
  ModelName,
  ThroughputRow,
} from "./types.js";

export async function loadDataset(): Promise<Dataset> {
  const [
    throughputRaw,
    gpuPricesRaw,
    awsGpuPricesRaw,
    awsSpotGpuPricesRaw,
    gpuMsrpRaw,
    electricityRaw,
    closedModelsRaw,
    cpuRaw,
    memoryRaw,
  ] = await Promise.all([
    fetchCsv("data/throughput.csv"),
    fetchCsv("data/gpu.csv"),
    fetchCsv("data/aws_gpu.csv"),
    fetchCsv("data/spot_aws_gpu.csv"),
    fetchCsv("data/gpu_msrp.csv"),
    fetchCsv("data/electricity.csv"),
    fetchCsv("data/closed_models.csv"),
    fetchCsv("data/cpu.csv"),
    fetchCsv("data/memory.csv"),
  ]);

  const throughput: ThroughputRow[] = throughputRaw.map((r) => ({
    model: r.model as ModelName,
    gpu: r.gpu as GpuType,
    gpuCount: Number(r.gpu_count) as GpuCount,
    concurrency: Number(r.concurrency),
    tpsPerGpu: Number(r.tps_per_gpu),
    tpsTotal: Number(r.tps_total),
    methodology: r.methodology ?? "",
    source: r.source ?? "",
  }));

  const toGpuPriceRow = (r: Record<string, string>): GpuPriceRow => ({
    date: r.date ?? "",
    gpu: r.gpu as GpuType,
    avgUsdHr: Number(r.avg_usd_hr),
    sampleCount: Number(r.sample_count),
  });
  const gpuPrices: GpuPriceRow[] = gpuPricesRaw.map(toGpuPriceRow);
  const awsGpuPrices: GpuPriceRow[] = awsGpuPricesRaw.map(toGpuPriceRow);
  const awsSpotGpuPrices: GpuPriceRow[] = awsSpotGpuPricesRaw.map(toGpuPriceRow);

  const gpuMsrp: GpuMsrpRow[] = gpuMsrpRaw.map((r) => ({
    gpu: r.gpu as GpuType,
    msrpUsd: Number(r.msrp_usd),
    tdpWatts: Number(r.tdp_watts),
    source: r.source ?? "",
  }));

  const electricity: ElectricityRow[] = electricityRaw.map((r) => ({
    state: r.state as ElectricityRow["state"],
    centsPerKwh: Number(r.cents_per_kwh),
    source: r.source ?? "",
  }));

  const closedModels: ClosedModelRow[] = closedModelsRaw.map((r) => ({
    model: r.model as ClosedModelRow["model"],
    inputPricePer1M: Number(r.input_price_per_1m),
    outputPricePer1M: Number(r.output_price_per_1m),
    costPerTask: Number(r.cost_per_task),
    source: r.source ?? "",
  }));

  const cpus: CpuRow[] = cpuRaw.map((r) => ({
    cpu: r.cpu as CpuRow["cpu"],
    cores: Number(r.cores),
    tdpWatts: Number(r.tdp_watts),
    msrpUsd: Number(r.msrp_usd),
    source: r.source ?? "",
  }));

  const memory: MemoryRow[] = memoryRaw.map((r) => ({
    capacityGb: Number(r.capacity_gb) as MemoryRow["capacityGb"],
    pricePerGbUsd: Number(r.price_per_gb_usd),
    totalUsd: Number(r.total_usd),
    source: r.source ?? "",
  }));

  return { throughput, gpuPrices, awsGpuPrices, awsSpotGpuPrices, gpuMsrp, electricity, closedModels, cpus, memory };
}
