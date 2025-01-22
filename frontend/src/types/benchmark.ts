// src/types/benchmark.ts
export interface BenchmarkConfig {
    total_requests: number;
    concurrency_level: number;
    max_tokens?: number;
    prompt: string;
    name: string;
    // description?: string;
    nim_id: string;
    gpu_count: number;
  }