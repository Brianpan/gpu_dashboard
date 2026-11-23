export type GpuType = "h100" | "h200" | "b200" | "b300";
export type ModelName = "Qwen3.8 Flash Next" | "Qwen3.8";
export type GpuCount = 1 | 2;
export type State = "CA" | "TX" | "NY";
export type DepreciationYears = 3 | 5 | 7 | 10;
export type MovingAvgWindow = 3 | 5 | 7 | 14;
export type ClosedModelName = "Fable 5.2" | "GPT 6.2";
export type CpuName = "Intel Xeon Gold 6338 (32-core)" | "Intel Xeon Platinum 8592+ (64-core)";
export type MemoryCapacity = 128 | 256 | 512 | 1024;

export interface ThroughputRow {
  model: ModelName;
  gpu: GpuType;
  gpuCount: GpuCount;
  concurrency: number;
  tpsPerGpu: number;
  tpsTotal: number;
  methodology: string;
  source: string;
}

export interface GpuPriceRow {
  date: string;
  gpu: GpuType;
  avgUsdHr: number;
  sampleCount: number;
}

export interface GpuMsrpRow {
  gpu: GpuType;
  msrpUsd: number;
  tdpWatts: number;
  source: string;
}

export interface ElectricityRow {
  state: State;
  centsPerKwh: number;
  source: string;
}

export interface ClosedModelRow {
  model: ClosedModelName;
  inputPricePer1M: number;
  outputPricePer1M: number;
  costPerTask: number;
  source: string;
}

export interface CpuRow {
  cpu: CpuName;
  cores: number;
  tdpWatts: number;
  msrpUsd: number;
  source: string;
}

export interface MemoryRow {
  capacityGb: MemoryCapacity;
  pricePerGbUsd: number;
  totalUsd: number;
  source: string;
}

export interface Dataset {
  throughput: ThroughputRow[];
  gpuPrices: GpuPriceRow[];
  awsGpuPrices: GpuPriceRow[];
  awsSpotGpuPrices: GpuPriceRow[];
  gpuMsrp: GpuMsrpRow[];
  electricity: ElectricityRow[];
  closedModels: ClosedModelRow[];
  cpus: CpuRow[];
  memory: MemoryRow[];
}
