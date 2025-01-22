// src/types/metrics.ts
export interface GpuMetrics {
  gpu_utilization: number;
  gpu_memory_used: number;
  gpu_memory_total: number;
  gpu_temp: number;
  power_draw: number;
}

export interface GpuStats {
  name: string;
  avgTps: number;
  powerEfficiency: number;
}

export interface MetricsData {
  cpu_usage: number;
  memory_used: number;
  memory_total: number;
  gpu_utilization: number;
  gpu_memory_used: number;
  gpu_memory_total: number;
  pcie_throughput: number | null;
  uptime: number;
  gpu_temp: number;
  gpu_memory: number;
  power_efficiency: number;
  gpu_metrics: GpuMetrics[];
  gpu_stats: GpuStats[];
  benchmark_counts: Record<string, number>;
  timestamp: number;
  ip_address: string;
  tokens_per_second?: number;
  power_draw?: number;
  latency?: number;
  gpu_count: number;
  tokens_per_watt: number;
  historical?: Array<{
    timestamp: string;
    tokens_per_second: number;
    latency: number;
  }>;
}