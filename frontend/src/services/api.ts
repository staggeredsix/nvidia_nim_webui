// src/services/api.ts

import axios from "axios";

const BASE_URL = "http://localhost:8000";

// Interfaces
export interface BenchmarkConfigHolder {
  total_requests: number;
  concurrency_level: number;
  max_tokens?: number;
  timeout?: number;
  prompt: string;
  name: string;
  description?: string;
}

export interface ContainerInfo {
  container_id: string;
  port: number;
  url: string;
  health: {
    healthy: boolean,
    status: string
  }
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

// Function Implementations with Holders
const getNimsHolder = async (): Promise<ContainerInfo[]> => {
  const response = await axios.get(`${BASE_URL}/api/nims`);
  return response.data;
};

const pullNimHolder = async (imageName: string): Promise<ContainerInfo> => {
  const response = await axios.post(`${BASE_URL}/api/nims/pull`, { imageName });
  return response.data.container;
};

const stopNimHolder = async (): Promise<void> => {
  await axios.post(`${BASE_URL}/api/nims/stop`);
};

const startBenchmarkHolder = async (
  config: BenchmarkConfigHolder
): Promise<{ run_id: number }> => {
  const response = await axios.post(`${BASE_URL}/api/benchmark`, config);
  return response.data;
};

const fetchBenchmarkHistoryHolder = async (): Promise<BenchmarkRun[]> => {
  const response = await axios.get(`${BASE_URL}/api/benchmark/history`);
  return response.data;
};

const exportBenchmarkHolder = async (runId: number): Promise<Blob> => {
  const response = await axios.get(`${BASE_URL}/api/benchmark/${runId}/export`, {
    responseType: 'blob'
  });
  return response.data;
};

const saveNgcKeyHolder = async (key: string): Promise<void> => {
  await axios.post(`${BASE_URL}/api/ngc-key`, { key });
};

const getNgcKeyHolder = async (): Promise<string | null> => {
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

const deleteNgcKeyHolder = async (): Promise<void> => {
  await axios.delete(`${BASE_URL}/api/ngc-key`);
};

// WebSocket Utility with Holder
const useWebSocketHolder = (url: string): WebSocket => {
  const ws = new WebSocket(url);
  ws.onopen = () => console.log("WebSocket connected");
  ws.onclose = () => console.log("WebSocket disconnected");
  return ws;
};

// Export Aliases
export const getNims = getNimsHolder;
export const pullNim = pullNimHolder;
export const stopNim = stopNimHolder;
export const startBenchmark = startBenchmarkHolder;
export const fetchBenchmarkHistory = fetchBenchmarkHistoryHolder;
export const exportBenchmark = exportBenchmarkHolder;
export const saveNgcKey = saveNgcKeyHolder;
export const getNgcKey = getNgcKeyHolder;
export const deleteNgcKey = deleteNgcKeyHolder;
export const useWebSocket = useWebSocketHolder;

const ws = new WebSocket("ws://localhost:8000/ws");

ws.onopen = () => console.log("WebSocket connected");
ws.onmessage = (event) => console.log("Received:", event.data);
ws.onerror = (error) => console.error("WebSocket error:", error);
ws.onclose = () => console.log("WebSocket disconnected");