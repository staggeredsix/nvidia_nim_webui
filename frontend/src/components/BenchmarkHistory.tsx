// src/components/BenchmarkHistory.tsx
import React, { useState, useEffect } from "react";
import { Download, ChevronDown, ChevronRight } from "lucide-react";
import { fetchBenchmarkHistory } from "../services/api";

interface BenchmarkMetrics {
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

interface Run {
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

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors = {
    completed: "bg-green-900 text-green-300",
    running: "bg-blue-900 text-blue-300",
    failed: "bg-red-900 text-red-300",
    stopped: "bg-yellow-900 text-yellow-300",
  };

  return (
    <span className={`px-2 py-1 rounded-full text-sm ${colors[status] || colors.failed}`}>
      {status}
    </span>
  );
};

const BenchmarkHistory: React.FC = () => {
  const [history, setHistory] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await fetchBenchmarkHistory();
      setHistory(data);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const exportResults = async (run: Run) => {
    const benchmarkData = {
      id: run.id,
      name: run.name,
      description: run.description,
      model_name: run.model_name,
      status: run.status,
      start_time: run.start_time,
      end_time: run.end_time,
      config: run.config,
      metrics: run.metrics,
    };

    const blob = new Blob([JSON.stringify(benchmarkData, null, 2)], {
      type: "application/json",
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `benchmark_${run.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_${run.id}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="text-center text-gray-400">Loading benchmark history...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Benchmark History</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-700">
                <th className="w-8"></th>
                <th>Name</th>
                <th>Model</th>
                <th>Status</th>
                <th>Started</th>
                <th>Duration</th>
                <th>Avg TPS</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((run) => (
                <React.Fragment key={run.id}>
                  <tr
                    onClick={() => toggleRow(run.id)}
                    className="cursor-pointer hover:bg-gray-700"
                  >
                    <td>
                      {expandedRows.has(run.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </td>
                    <td>{run.name}</td>
                    <td>{run.model_name}</td>
                    <td><StatusBadge status={run.status} /></td>
                    <td>{new Date(run.start_time).toLocaleString()}</td>
                    <td>
                      {run.end_time
                        ? `${Math.round(
                            (new Date(run.end_time).getTime() - new Date(run.start_time).getTime()) / 1000
                          )}s`
                        : "Running"}
                    </td>
                    <td>{run.metrics?.average_tps?.toFixed(2) || "N/A"}</td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportResults(run);
                        }}
                        className="text-blue-400 hover:text-blue-300 flex items-center"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Export
                      </button>
                    </td>
                  </tr>
                  {expandedRows.has(run.id) && (
                    <tr>
                      <td colSpan={8} className="bg-gray-900 p-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          <div>
                            <h4 className="font-medium mb-2">Performance Metrics</h4>
                            <dl className="space-y-1 text-sm">
                              <div>
                                <dt className="text-gray-400">Peak TPS:</dt>
                                <dd>{run.metrics?.peak_tps?.toFixed(2) || "N/A"}</dd>
                              </div>
                              <div>
                                <dt className="text-gray-400">P95 Latency:</dt>
                                <dd>{run.metrics?.p95_latency?.toFixed(2) || "N/A"} ms</dd>
                              </div>
                              <div>
                                <dt className="text-gray-400">Time to First Token:</dt>
                                <dd>{run.metrics?.time_to_first_token?.toFixed(2) || "N/A"} ms</dd>
                              </div>
                              <div>
                                <dt className="text-gray-400">Inter-token Latency:</dt>
                                <dd>{run.metrics?.inter_token_latency?.toFixed(2) || "N/A"} ms</dd>
                              </div>
                            </dl>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">GPU Metrics</h4>
                            <dl className="space-y-1 text-sm">
                              <div>
                                <dt className="text-gray-400">Avg GPU Utilization:</dt>
                                <dd>{run.metrics?.average_gpu_utilization?.toFixed(1) || "N/A"}%</dd>
                              </div>
                              <div>
                                <dt className="text-gray-400">Peak GPU Utilization:</dt>
                                <dd>{run.metrics?.peak_gpu_utilization?.toFixed(1) || "N/A"}%</dd>
                              </div>
                              <div>
                                <dt className="text-gray-400">Avg GPU Memory:</dt>
                                <dd>{run.metrics?.average_gpu_memory?.toFixed(1) || "N/A"} GB</dd>
                              </div>
                              <div>
                                <dt className="text-gray-400">Peak GPU Memory:</dt>
                                <dd>{run.metrics?.peak_gpu_memory?.toFixed(1) || "N/A"} GB</dd>
                              </div>
                              <div>
                                <dt className="text-gray-400">GPU Power Draw:</dt>
                                <dd>{run.metrics?.gpu_power_draw?.toFixed(1) || "N/A"} W</dd>
                              </div>
                            </dl>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Request Statistics</h4>
                            <dl className="space-y-1 text-sm">
                              <div>
                                <dt className="text-gray-400">Total Tokens:</dt>
                                <dd>{run.metrics?.total_tokens?.toLocaleString() || "N/A"}</dd>
                              </div>
                              <div>
                                <dt className="text-gray-400">Successful Requests:</dt>
                                <dd>{run.metrics?.successful_requests?.toLocaleString() || "N/A"}</dd>
                              </div>
                              <div>
                                <dt className="text-gray-400">Failed Requests:</dt>
                                <dd>{run.metrics?.failed_requests?.toLocaleString() || "N/A"}</dd>
                              </div>
                            </dl>
                          </div>
                          {run.description && (
                            <div>
                              <h4 className="font-medium mb-2">Description</h4>
                              <p className="text-sm text-gray-300">{run.description}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BenchmarkHistory;