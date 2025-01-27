import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { startBenchmark, getNims } from '@/services/api';
import { AlertCircle } from 'lucide-react';
import type { BenchmarkConfig } from '@/types/benchmark';

const BenchmarkConfiguration = () => {
  const [formData, setFormData] = useState({
    name: '',
    prompt: '',
    total_requests: 100,
    concurrency_level: 10,
    max_tokens: 50,
    nim_id: '',
    gpu_count: 1,
    stream: true
  });
  const [nims, setNims] = useState([]);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    getNims().then(setNims).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const config: BenchmarkConfig = {
        ...formData,
      };
      await startBenchmark(config);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Benchmark Configuration</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-gray-700 rounded p-2"
            />
          </div>
          
          <div>
            <label className="block text-sm mb-1">NIM</label>
            <select 
              value={formData.nim_id}
              onChange={e => setFormData({...formData, nim_id: e.target.value})}
              className="w-full bg-gray-700 rounded p-2"
            >
              <option value="">Select NIM</option>
              {nims.map(nim => (
                <option key={nim.container_id} value={nim.container_id}>
                  {nim.image_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Prompt Template</label>
            <textarea
              value={formData.prompt}
              onChange={e => setFormData({...formData, prompt: e.target.value})}
              className="w-full bg-gray-700 rounded p-2"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Total Requests</label>
              <input
                type="number"
                value={formData.total_requests}
                onChange={e => setFormData({...formData, total_requests: Number(e.target.value)})}
                className="w-full bg-gray-700 rounded p-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Concurrency</label>
              <input
                type="number"
                value={formData.concurrency_level}
                onChange={e => setFormData({...formData, concurrency_level: Number(e.target.value)})}
                className="w-full bg-gray-700 rounded p-2"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 py-2 px-4 rounded"
          >
            Start Benchmark
          </button>
        </form>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Real-time Metrics</h2>
        {metrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {metrics.gpu_metrics.map((gpu, i) => (
                <div key={i} className="bg-gray-700 p-4 rounded">
                  <h3 className="font-medium mb-2">GPU {i}</h3>
                  <p>Utilization: {gpu.gpu_utilization}%</p>
                  <p>Memory: {gpu.gpu_memory_used}GB / {gpu.gpu_memory_total}GB</p>
                  <p>Temperature: {gpu.gpu_temp}°C</p>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={metrics.historical || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="throughput" name="Tokens/sec" />
                <Line type="monotone" dataKey="latency" name="Latency (ms)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default BenchmarkConfiguration;