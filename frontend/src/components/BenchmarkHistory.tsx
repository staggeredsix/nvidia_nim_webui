import React, { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { fetchBenchmarkHistory } from "../services/api";

// Define Run type matching API response
interface Run {
  id: number;
  model_name: string;
  status: string;
  start_time: string;
  end_time?: string;
  metrics?: {
    average_tps?: number;
    p95_latency?: number;
  };
}

// Status Badge Component
interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const colors: Record<string, string> = {
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

// Main Component
const BenchmarkHistory: React.FC = () => {
  const [history, setHistory] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

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

  const exportResults = async (runId: number) => {
    try {
      const response = await fetch(`/api/benchmark/${runId}/export`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `benchmark-${runId}-results.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting results:", error);
    }
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
                <tr
                  key={run.id}
                  className="cursor-pointer hover:bg-gray-700"
                >
                  <td>{run.model_name}</td>
                  <td>
                    <StatusBadge status={run.status} />
                  </td>
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
                      onClick={() => exportResults(run.id)}
                      className="text-blue-400 hover:underline"
                    >
                      <Download className="inline w-4 h-4" />
                      Export
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BenchmarkHistory;
