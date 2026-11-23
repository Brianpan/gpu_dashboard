import type {
  ClosedModelName,
  CpuName,
  DepreciationYears,
  GpuCount,
  GpuType,
  MemoryCapacity,
  ModelName,
  MovingAvgWindow,
  State,
} from "./types.js";

export type Tab = "build" | "rent" | "frontier";

export interface AppState {
  tab: Tab;
  gpu: GpuType;
  model: ModelName;
  gpuCount: GpuCount;
  // single source of truth for "which closed model" — used both as the
  // Frontier tab's own model and as the comparison baseline on every tab,
  // so there is only one selector to keep in sync.
  closedModel: ClosedModelName;
  state: State;
  years: DepreciationYears;
  window: MovingAvgWindow;
  cpu: CpuName;
  memoryGb: MemoryCapacity;
}

export const state: AppState = {
  tab: "build",
  gpu: "h100",
  model: "Qwen3.8 Flash Next",
  gpuCount: 1,
  closedModel: "GPT 6.2",
  state: "TX",
  years: 5,
  window: 7,
  cpu: "Intel Xeon Gold 6338 (32-core)",
  memoryGb: 256,
};

type Listener = () => void;
const listeners: Listener[] = [];

export function onChange(listener: Listener): void {
  listeners.push(listener);
}

export function notify(): void {
  listeners.forEach((l) => l());
}
