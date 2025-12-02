// src/services/api.ts
import axios from "axios";
import type { BenchmarkRun as BenchmarkRunType, BenchmarkConfig as BenchmarkConfigType } from "../types/benchmark";
import { API_BASE_URL, WS_BASE_URL } from "@/config";

const BASE_URL = API_BASE_URL;
const WS_BASE = WS_BASE_URL;

// Re-export types
export type BenchmarkRun = BenchmarkRunType;
export type BenchmarkConfig = BenchmarkConfigType;

export interface ContainerInfo {
  container_id: string | null;
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
  tokens_per_second: number;
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

export interface StartBenchmarkResponse {
  run_id: number;
  metrics: any;
  container_id?: string;
}

export interface NgcModelSetupRequest {
  source: string;
  model_name: string;
  backends?: string[];
  overwrite?: boolean;
}

export interface NgcModelSetupResponse {
  model_name: string;
  target_root: string;
  backends: Record<string, { model_dir: string; launch_example: string }>;
  download: { stdout: string; stderr: string };
}

// API Functions
export const startBenchmark = async (config: BenchmarkConfig): Promise<StartBenchmarkResponse> => {
  console.log("Sending benchmark request:", config);
  try {
    const response = await axios.post(`${BASE_URL}/benchmark`, config);
    return response.data;
  } catch (error) {
    console.error("Benchmark request error:", error);
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || "Failed to start benchmark");
    }
    throw error;
  }
};

export const fetchBenchmarkHistory = async (): Promise<BenchmarkRun[]> => {
  const response = await axios.get(`${BASE_URL}/benchmark/history`);
  return response.data;
};

export const saveNgcKey = async (key: string): Promise<void> => {
  try {
    await axios.post(`${BASE_URL}/ngc-key`, { key });
  } catch (error) {
    console.error("Error saving NGC key:", error);
    throw error;
  }
};

export const getNgcKey = async (): Promise<string | null> => {
  try {
    const response = await axios.get(`${BASE_URL}/ngc-key`);
    return response.data.key;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error("Error retrieving NGC key:", error);
    throw error;
  }
};

export const deleteNgcKey = async (): Promise<void> => {
  try {
    await axios.delete(`${BASE_URL}/ngc-key`);
  } catch (error) {
    console.error("Error deleting NGC key:", error);
    throw error;
  }
};

export const setupNgcModel = async (
  payload: NgcModelSetupRequest
): Promise<NgcModelSetupResponse> => {
  try {
    const response = await axios.post(`${BASE_URL}/models/ngc`, payload);
    return response.data;
  } catch (error) {
    console.error("Error preparing NGC model:", error);
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || "Failed to prepare model");
    }
    throw error;
  }
};

export const getNims = async (): Promise<ContainerInfo[]> => {
  try {
    const response = await axios.get(`${BASE_URL}/nims`);
    return response.data;
  } catch (error) {
    console.error("Error fetching NIMs:", error);
    throw error;
  }
};

export const pullNim = async (imageName: string): Promise<ContainerInfo> => {
  try {
    const response = await axios.post(`${BASE_URL}/nims/pull`, { image_name: imageName });
    return response.data.container;
  } catch (error) {
    console.error("Error pulling NIM:", error);
    throw error;
  }
};

export const stopNim = async (containerId?: string): Promise<void> => {
  try {
    const payload = containerId ? { container_id: containerId } : undefined;
    await axios.post(`${BASE_URL}/nims/stop`, payload);
  } catch (error) {
    console.error("Error stopping NIM:", error);
    throw error;
  }
};

export const saveLogs = async (containerId: string, filename: string): Promise<void> => {
  try {
    await axios.post(`${BASE_URL}/logs/save`, {
      container_id: containerId,
      filename: filename,
    });
  } catch (error) {
    console.error("Error saving logs:", error);
    throw error;
  }
};

// WebSocket connection for live logs
export const createLogStream = (containerId: string, onMessage: (log: string) => void) => {
  const ws = new WebSocket(`${WS_BASE}/ws/logs/${containerId}`);
  ws.onmessage = (event) => {
    onMessage(JSON.parse(event.data).log);
  };
  return ws;
};
