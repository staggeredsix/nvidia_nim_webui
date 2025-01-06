import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  AlertCircle,
} from 'lucide-react';
import useWebSocket from '@/hooks/useWebSocket';
import { fetchBenchmarkHistory } from "../services/api";

const Home = () => {
  const [gpuData, setGpuData] = useState([]);
  const { metrics, error: wsError } = useWebSocket('ws://localhost:8000/metrics');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (metrics?.gpu_stats) {
      setGpuData(metrics.gpu_stats);
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
          <div>
            <p>Tokens Per Second: {metrics.tokens_per_second || 0}</p>
            <p>GPU Utilization: {metrics.gpu_utilization || 0}%</p>
            <p>Power Efficiency: {metrics.power_efficiency || 0}</p>
            <p>GPU Memory: {metrics.gpu_memory || 0} MB</p>
            <p>GPU Temperature: {metrics.gpu_temp || 0}°C</p>
          </div>
        ) : (
          <p>Metrics are currently unavailable.</p>
        )}
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">GPU Statistics</h2>
        {gpuData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={gpuData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avgTps" stroke="#8884d8" />
              <Line type="monotone" dataKey="powerEfficiency" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p>No GPU statistics available.</p>
        )}
      </div>

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
