import { fetchCsv } from "./csv.js";
export async function loadDataset() {
    const [throughputRaw, gpuPricesRaw, awsGpuPricesRaw, awsSpotGpuPricesRaw, gpuMsrpRaw, electricityRaw, closedModelsRaw, cpuRaw, memoryRaw,] = await Promise.all([
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
    const throughput = throughputRaw.map((r) => ({
        model: r.model,
        gpu: r.gpu,
        gpuCount: Number(r.gpu_count),
        concurrency: Number(r.concurrency),
        tpsPerGpu: Number(r.tps_per_gpu),
        tpsTotal: Number(r.tps_total),
        methodology: r.methodology ?? "",
        source: r.source ?? "",
    }));
    const toGpuPriceRow = (r) => ({
        date: r.date ?? "",
        gpu: r.gpu,
        avgUsdHr: Number(r.avg_usd_hr),
        sampleCount: Number(r.sample_count),
    });
    const gpuPrices = gpuPricesRaw.map(toGpuPriceRow);
    const awsGpuPrices = awsGpuPricesRaw.map(toGpuPriceRow);
    const awsSpotGpuPrices = awsSpotGpuPricesRaw.map(toGpuPriceRow);
    const gpuMsrp = gpuMsrpRaw.map((r) => ({
        gpu: r.gpu,
        msrpUsd: Number(r.msrp_usd),
        tdpWatts: Number(r.tdp_watts),
        source: r.source ?? "",
    }));
    const electricity = electricityRaw.map((r) => ({
        state: r.state,
        centsPerKwh: Number(r.cents_per_kwh),
        source: r.source ?? "",
    }));
    const closedModels = closedModelsRaw.map((r) => ({
        model: r.model,
        inputPricePer1M: Number(r.input_price_per_1m),
        outputPricePer1M: Number(r.output_price_per_1m),
        costPerTask: Number(r.cost_per_task),
        source: r.source ?? "",
    }));
    const cpus = cpuRaw.map((r) => ({
        cpu: r.cpu,
        cores: Number(r.cores),
        tdpWatts: Number(r.tdp_watts),
        msrpUsd: Number(r.msrp_usd),
        source: r.source ?? "",
    }));
    const memory = memoryRaw.map((r) => ({
        capacityGb: Number(r.capacity_gb),
        pricePerGbUsd: Number(r.price_per_gb_usd),
        totalUsd: Number(r.total_usd),
        source: r.source ?? "",
    }));
    return { throughput, gpuPrices, awsGpuPrices, awsSpotGpuPrices, gpuMsrp, electricity, closedModels, cpus, memory };
}
