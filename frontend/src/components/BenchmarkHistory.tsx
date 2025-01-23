import React, { useState, useEffect } from "react";
import { Download, ChevronDown, ChevronRight } from "lucide-react";
import { fetchBenchmarkHistory, type BenchmarkRun } from "@/services/api";
import { formatNumber } from "@/utils/format";

interface Metrics {
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

interface Run extends BenchmarkRun {
  metrics: BenchmarkRun['metrics'];
}

const BenchmarkHistory = () => {
  const [history, setHistory] = useState<BenchmarkRun[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetchBenchmarkHistory();
      setHistory(response);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loading) {
    return <div className="text-center text-gray-400 p-4">Loading benchmark history...</div>;
  }

  return (
    <div className="space-y-4 bg-gray-900 p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Benchmark History</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b border-gray-800">
              <th className="p-2"></th>
              <th className="p-2">Name</th>
              <th className="p-2">Model</th>
              <th className="p-2">Status</th>
              <th className="p-2">Started</th>
              <th className="p-2">Duration</th>
              <th className="p-2">Avg TPS</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {history.map((run) => (
              <React.Fragment key={run.id}>
                <tr 
                  className="border-b border-gray-800 cursor-pointer hover:bg-gray-800"
                  onClick={() => toggleRow(run.id)}
                >
                  <td className="p-2">
                    {expandedRows.has(run.id) ? <ChevronDown /> : <ChevronRight />}
                  </td>
                  <td className="p-2">{run.name}</td>
                  <td className="p-2">{run.model_name}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      run.status === 'completed' ? 'bg-green-900 text-green-300' :
                      'bg-yellow-900 text-yellow-300'
                    }`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="p-2">{new Date(run.start_time).toLocaleString()}</td>
                  <td className="p-2">
                    {run.end_time ? (
                      `${Math.round((new Date(run.end_time).getTime() - new Date(run.start_time).getTime()) / 1000)}s`
                    ) : '-'}
                  </td>
                  <td className="p-2">
                    {formatNumber(run.metrics?.tokens_per_second || 0)} t/s
                  </td>
                  <td className="p-2">
                    <Download className="w-4 h-4 text-blue-400 hover:text-blue-300" />
                  </td>
                </tr>
                {expandedRows.has(run.id) && (
                  <tr>
                    <td colSpan={8} className="bg-gray-800 p-4">
                      <div className="grid grid-cols-3 gap-6">
                        <div>
                          <h4 className="font-medium mb-2">Performance Metrics</h4>
                          <dl className="space-y-2">
                            <div>
                              <dt className="text-gray-400">Peak TPS</dt>
                              <dd>{formatNumber(run.metrics.peak_tps)} t/s</dd>
                            </div>
                            <div>
                              <dt className="text-gray-400">P95 Latency</dt>
                              <dd>{formatNumber(run.metrics.p95_latency)} ms</dd>
                            </div>
                            <div>
                              <dt className="text-gray-400">Time to First Token</dt>
                              <dd>{formatNumber(run.metrics.time_to_first_token)} ms</dd>
                            </div>
                          </dl>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">GPU Metrics</h4>
                          <dl className="space-y-2">
                            <div>
                              <dt className="text-gray-400">GPU Utilization</dt>
                              <dd>{formatNumber(run.metrics.average_gpu_utilization)}%</dd>
                            </div>
                            <div>
                              <dt className="text-gray-400">Peak GPU Memory</dt>
                              <dd>{formatNumber(run.metrics.peak_gpu_memory)} GB</dd>
                            </div>
                            <div>
                              <dt className="text-gray-400">Power Draw</dt>
                              <dd>{formatNumber(run.metrics.gpu_power_draw)} W</dd>
                            </div>
                          </dl>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Request Statistics</h4>
                          <dl className="space-y-2">
                            <div>
                              <dt className="text-gray-400">Total Tokens</dt>
                              <dd>{run.metrics.total_tokens.toLocaleString()}</dd>
                            </div>
                            <div>
                              <dt className="text-gray-400">Successful Requests</dt>
                              <dd>{run.metrics.successful_requests.toLocaleString()}</dd>
                            </div>
                            <div>
                              <dt className="text-gray-400">Failed Requests</dt>
                              <dd>{run.metrics.failed_requests.toLocaleString()}</dd>
                            </div>
                          </dl>
                        </div>
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
  );
};

export default BenchmarkHistory;