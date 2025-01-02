import axios from "axios";

const BASE_URL = "http://localhost:8000";

// Interfaces
export interface BenchmarkConfigHolder {
  total_requests: number;
  concurrency_level: number;
  max_tokens?: number;
  timeout?: number;
  prompt: string;
}

export interface ContainerInfoHolder {
  container_id: string;
  port: number;
  url: string;
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
  config: BenchmarkConfig
): Promise<{ run_id: number }> => {
  const response = await axios.post(`${BASE_URL}/api/benchmark/standard`, config);
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
      return null; // Key not found
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
export const saveNgcKey = saveNgcKeyHolder;
export const getNgcKey = getNgcKeyHolder;
export const deleteNgcKey = deleteNgcKeyHolder;
export const useWebSocket = useWebSocketHolder;

// Type Exports
export type BenchmarkConfig = BenchmarkConfigHolder
export type ContainerInfo = ContainerInfoHolder

const ws = new WebSocket("ws://localhost:8000/ws"); // Ensure this URL is correct

ws.onopen = () => console.log("WebSocket connected");
ws.onmessage = (event) => console.log("Received:", event.data);
ws.onerror = (error) => console.error("WebSocket error:", error);
ws.onclose = () => console.log("WebSocket disconnected");

