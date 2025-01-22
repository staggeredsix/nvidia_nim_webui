// src/routes/Home.tsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle } from 'lucide-react';
import useWebSocket from '@/hooks/useWebSocket';
import { fetchBenchmarkHistory } from "../services/api";

const Home = () => {
  const [gpuData, setGpuData] = useState([]);
  const { metrics, error: wsError } = useWebSocket('ws://localhost:8000/metrics');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (metrics?.gpu_metrics) {
      setGpuData(metrics.gpu_metrics.map((metric, index) => ({
        name: `GPU ${index}`,
        utilization: metric.gpu_utilization,
        power: metric.power_draw
      })));
    }
  }, [metrics]);

  useEffect(() => {
    fetchHistoricalData();
  }, []);

  const fetchHistoricalData = async () => {
    try {
      const data = await fetchBenchmarkHistory();
      setHistory(data);
    } catch (error) {
      console.error("Failed to fetch benchmark history:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {wsError && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span>{wsError}</span>
        </div>
      )}

      <div className="card">
        <h2 className="text-xl font-bold mb-4">System Metrics</h2>
        {metrics ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.gpu_metrics.map((gpu, index) => (
              <div key={index} className="p-4 bg-gray-800 rounded-lg">
                <h3 className="text-sm font-medium mb-2">GPU {index}</h3>
                <p>Utilization: {gpu.gpu_utilization}%</p>
                <p>Memory: {(gpu.gpu_memory_used / 1024).toFixed(1)}GB</p>
                <p>Temperature: {gpu.gpu_temp}°C</p>
                <p>Power: {gpu.power_draw}W</p>
              </div>
            ))}
          </div>
        ) : (
          <p>Metrics are currently unavailable or loading, please wait...</p>
        )}
      </div>

      {gpuData.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">GPU Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={gpuData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="utilization" stroke="#8884d8" name="Utilization %" />
              <Line type="monotone" dataKey="power" stroke="#82ca9d" name="Power (W)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Recent Benchmarks</h2>
        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : history.length === 0 ? (
          <p className="text-gray-400">No benchmarks available.</p>
        ) : (
          <ul className="list-disc pl-5 space-y-2">
            {history.map((run, index) => (
              <li key={index}>
                <p>
                  <strong>Model:</strong> {run.model_name} | <strong>Status:</strong> {run.status} |{' '}
                  <strong>Start Time:</strong> {new Date(run.start_time).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Home;