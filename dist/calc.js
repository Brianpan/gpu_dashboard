// Agentic-coding workloads skew input-heavy; used to blend a single $/1M
// token figure out of a closed model's separate input/output prices.
const INPUT_OUTPUT_BLEND_RATIO = { input: 4, output: 1 };
export function getThroughput(ds, model, gpu, gpuCount) {
    const row = ds.throughput.find((r) => r.model === model && r.gpu === gpu && r.gpuCount === gpuCount);
    if (!row)
        throw new Error(`no throughput row for ${model}/${gpu}/x${gpuCount}`);
    return row;
}
// null means no price history exists for this GPU in the given series (e.g.
// AWS has no on-demand B200/B300 listing yet).
export function movingAvgPrice(prices, gpu, window) {
    const series = prices.filter((r) => r.gpu === gpu).sort((a, b) => a.date.localeCompare(b.date));
    if (series.length === 0)
        return null;
    const slice = series.slice(-window);
    const sum = slice.reduce((acc, r) => acc + r.avgUsdHr, 0);
    return sum / slice.length;
}
export function buildOwnCostPerHour(ds, gpu, gpuCount, state, years, cpu, memoryGb) {
    const msrpRow = ds.gpuMsrp.find((r) => r.gpu === gpu);
    const elecRow = ds.electricity.find((r) => r.state === state);
    const cpuRow = ds.cpus.find((r) => r.cpu === cpu);
    const memRow = ds.memory.find((r) => r.capacityGb === memoryGb);
    // CPU and memory are host-level, not per-GPU: one CPU/memory config serves
    // the whole box regardless of how many GPUs are attached.
    const hoursInLife = years * 365 * 24;
    const hardwarePerHour = (msrpRow.msrpUsd * gpuCount) / hoursInLife + cpuRow.msrpUsd / hoursInLife + memRow.totalUsd / hoursInLife;
    // Memory power draw is omitted: no reliable public per-DIMM wattage dataset
    // exists, and it is small relative to GPU/CPU draw at these capacities.
    const electricityPerHour = ((msrpRow.tdpWatts * gpuCount + cpuRow.tdpWatts) / 1000) * (elecRow.centsPerKwh / 100);
    return { perHour: hardwarePerHour + electricityPerHour, hardwarePerHour, electricityPerHour };
}
export function rentCostPerHour(prices, gpu, gpuCount, window) {
    const avg = movingAvgPrice(prices, gpu, window);
    return avg === null ? null : avg * gpuCount;
}
// AWS has no on-demand listing for every GPU (e.g. B200/B300 are
// Capacity-Block-only): fall back to AWS spot pricing before giving up.
export function awsRentCostPerHour(ds, gpu, gpuCount, window) {
    const onDemand = rentCostPerHour(ds.awsGpuPrices, gpu, gpuCount, window);
    if (onDemand !== null)
        return { perHour: onDemand, tier: "on-demand" };
    const spot = rentCostPerHour(ds.awsSpotGpuPrices, gpu, gpuCount, window);
    if (spot !== null)
        return { perHour: spot, tier: "spot" };
    return null;
}
export function costPer1MTokens(costPerHour, tpsTotal) {
    const tokensPerHour = tpsTotal * 3600;
    return (costPerHour / tokensPerHour) * 1000000;
}
export function closedModelBlendedCostPer1M(row) {
    const { input, output } = INPUT_OUTPUT_BLEND_RATIO;
    return (row.inputPricePer1M * input + row.outputPricePer1M * output) / (input + output);
}
// Scales a closed model's published cost-per-task by the ratio between our
// $/1M-token economics and the closed model's own $/1M-token price, so the
// same "task" is re-priced at our hardware's token cost.
export function adjustedCostPerTask(ourCostPer1M, closedModel) {
    const refCostPer1M = closedModelBlendedCostPer1M(closedModel);
    return (ourCostPer1M / refCostPer1M) * closedModel.costPerTask;
}
