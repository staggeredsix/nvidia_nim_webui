// src/routes/Benchmarks.tsx
import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import TestControls from "@/components/TestControls";
import BenchmarkHistory from "@/components/BenchmarkHistory";
import SystemMetrics from "@/components/SystemMetrics";
import { getNims } from "@/services/api";
import { MetricsData } from "@/types/metrics";

const defaultMetrics: MetricsData = {
  cpu_usage: 0,
  memory_used: 0,
  memory_total: 0,
  gpu_utilization: 0,
  gpu_memory_used: 0,
  gpu_memory_total: 0,
  pcie_throughput: null,
  uptime: 0,
  gpu_temp: 0,
  gpu_memory: 0,
  power_efficiency: 0,
  gpu_metrics: [],
  gpu_stats: [],
  benchmark_counts: {},
  timestamp: Date.now(),
  ip_address: 'Unknown',
  gpu_count: 0,
  tokens_per_watt: 0
};

const Benchmarks = () => {
  const [selectedNim, setSelectedNim] = useState<string>("");
  const [installedNims, setInstalledNims] = useState<Array<any>>([]);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<MetricsData>(defaultMetrics);

  useEffect(() => {
    const fetchNimsData = async () => {
      try {
        setIsLoading(true);
        const data = await getNims();
        setInstalledNims(data);
        if (data.length > 0 && !selectedNim) {
          setSelectedNim(data[0].container_id);
        }
      } catch (error) {
        console.error("Error fetching NIMs:", error);
        setError("Failed to fetch installed NIMs");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNimsData();
  }, []);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span>{error}</span>
        </div>
      )}

      <div className="card bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Select NIM</h2>
        <select
          value={selectedNim}
          onChange={(e) => setSelectedNim(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
        >
          <option value="">Select a NIM...</option>
          {installedNims.map((nim: any) => (
            <option key={nim.container_id} value={nim.container_id}>
              {nim.image_name} {nim.status === 'running' && `(Port: ${nim.port})`}
            </option>
          ))}
        </select>
      </div>

      <TestControls isLoading={isLoading} />

      <div className="card bg-gray-800 rounded-lg p-6">
        <SystemMetrics metrics={metrics} />
      </div>

      <div className="card bg-gray-800 rounded-lg p-6">
        <BenchmarkHistory />
      </div>
    </div>
  );
};

export default Benchmarks;