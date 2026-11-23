export const state = {
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
const listeners = [];
export function onChange(listener) {
    listeners.push(listener);
}
export function notify() {
    listeners.forEach((l) => l());
}
