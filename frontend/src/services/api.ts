// src/services/api.ts
import axios from "axios";

const BASE_URL = "http://localhost:8000";

// Interfaces
export interface BenchmarkConfig {
  total_requests: number;
  concurrency_level: number;
  max_tokens?: number;
  prompt: string;
  name: string;
  description?: string;
  nim_id: string;
}

export interface ContainerInfo {
  container_id: string;
  image_name: string;
  port: number | null;
  status: string;
  is_container: boolean;
  health: {
    healthy: boolean;
    status: string;
    checks: any[];
  };
  labels: Record<string, string>;
  tags: string[];
}

export interface BenchmarkMetrics {
  average_tps: number;
  peak_tps: number;
  p95_latency: number;
  time_to_first_token: number;
  inter_token_latency: number;
  average_gpu_utilization: number;
  peak_gpu_utilization: number;
  average_gpu_memory: number;
  peak_gpu_memory: number;
  gpu_power_draw: number;
  total_tokens: number;
  successful_requests: number;
  failed_requests: number;
}

export interface BenchmarkRun {
  id: number;
  name: string;
  description?: string;
  model_name: string;
  status: string;
  start_time: string;
  end_time?: string;
  config: any;
  metrics?: BenchmarkMetrics;
}

// API Functions
export const startBenchmark = async (config: BenchmarkConfig) => {
  console.log("Sending benchmark request:", config);
  try {
    const response = await axios.post(`${BASE_URL}/api/benchmark`, config);
    return response.data;
  } catch (error) {
    console.error("Benchmark request error:", error);
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || 'Failed to start benchmark');
    }
    throw error;
  }
};

export const fetchBenchmarkHistory = async (): Promise<BenchmarkRun[]> => {
  const response = await axios.get(`${BASE_URL}/api/benchmark/history`);
  return response.data;
};

export const saveNgcKey = async (key: string): Promise<void> => {
  await axios.post(`${BASE_URL}/api/ngc-key`, { key });
};

export const getNgcKey = async (): Promise<string | null> => {
  try {
    const response = await axios.get(`${BASE_URL}/api/ngc-key`);
    return response.data.key;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const deleteNgcKey = async (): Promise<void> => {
  await axios.delete(`${BASE_URL}/api/ngc-key`);
};

export const getNims = async (): Promise<ContainerInfo[]> => {
  const response = await axios.get(`${BASE_URL}/api/nims`);
  return response.data;
};

export const pullNim = async (imageName: string): Promise<ContainerInfo> => {
  const response = await axios.post(`${BASE_URL}/api/nims/pull`, { image_name: imageName });
  return response.data.container;
};

export const stopNim = async (): Promise<void> => {
  await axios.post(`${BASE_URL}/api/nims/stop`);
};