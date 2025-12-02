// src/types/benchmark.ts
export interface BenchmarkConfig {
  total_requests: number;
  concurrency_level: number;
  max_tokens?: number;
  prompt: string;
  name: string;
  description?: string;
  nim_id?: string;
  gpu_count?: number;
  stream?: boolean;
  provider?: string;
  endpoint?: string;
  model_name?: string;
  quantization?: string;
  expected_output?: string;
  port?: number;
}

export interface BenchmarkMetrics {
  tokens_per_second: number;
  peak_tps: number;
  latency: number;
  p95_latency: number;
  time_to_first_token: number;
  inter_token_latency: number;
  prefill_latency: number;
  total_completion_time: number;
  tool_call_latency?: number;
  tool_call_accuracy?: number | null;
  average_gpu_utilization?: number;
  peak_gpu_utilization?: number;
  average_gpu_memory?: number;
  peak_gpu_memory?: number;
  gpu_power_draw?: number;
  gpu_metrics: Array<{
    gpu_utilization: number;
    gpu_memory_used: number;
    gpu_memory_total?: number;
    gpu_temp: number;
    power_draw: number;
  }>;
  total_tokens: number;
  successful_requests: number;
  failed_requests: number;
  model_name?: string;
  provider?: string;
  quantization?: string;
  tokens_per_watt?: number;
}

export interface BenchmarkRun {
  id: number;
  name: string;
  model_name: string;
  status: string;
  start_time: string;
  end_time?: string;
  config: BenchmarkConfig;
  metrics: BenchmarkMetrics;
  container_id?: string;
}

export type Run = BenchmarkRun;
