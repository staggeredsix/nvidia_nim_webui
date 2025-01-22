// src/components/TestControls.tsx
import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { startBenchmark, getNims, saveLogs } from "../services/api";
import type { BenchmarkConfig } from '../types/benchmark';
import LogViewer from './LogViewer';

interface TestControlsProps {
  isLoading?: boolean;
  onStartBenchmark?: () => void;
  onStopBenchmark?: () => void;
}

const TestControls: React.FC<TestControlsProps> = ({ isLoading, onStartBenchmark, onStopBenchmark }) => {
  const [nims, setNims] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    total_requests: 100,
    concurrency_level: 10,
    max_tokens: 50,
    prompt: 'Translate the following text:',
    nim_id: '',
    gpu_count: 1,
  });
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [containerStatus, setContainerStatus] = useState('');
  const [activeContainer, setActiveContainer] = useState<string | null>(null);
  const [isContainerRunning, setIsContainerRunning] = useState(false);

  useEffect(() => {
    loadNims();
    const interval = setInterval(loadNims, 5000); // Poll for container status
    return () => clearInterval(interval);
  }, []);

  const loadNims = async () => {
    try {
      const nimData = await getNims();
      setNims(nimData);
      // Update container status if there's an active container
      if (activeContainer) {
        const activeNim = nimData.find(nim => nim.container_id === activeContainer);
        setIsContainerRunning(activeNim?.status === 'running');
      }
    } catch (err) {
      console.error("Error loading NIMs:", err);
      setError("Failed to load NIMs");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setContainerStatus('Starting NIM container (this may take 5+ minutes)...');

    try {
      if (!formData.name.trim()) {
        setError('Please provide a benchmark name');
        return;
      }

      if (!formData.nim_id) {
        setError('Please select a NIM');
        return;
      }

      const config: BenchmarkConfig = {
        total_requests: formData.total_requests,
        concurrency_level: formData.concurrency_level,
        max_tokens: formData.max_tokens,
        prompt: formData.prompt,
        name: formData.name,
        nim_id: formData.nim_id,
        gpu_count: formData.gpu_count
      };
      
      const response = await startBenchmark(config);
      setActiveContainer(response.container_id);
      if (onStartBenchmark) onStartBenchmark();
    } catch (err) {
      console.error("Error starting benchmark:", err);
      setError(err instanceof Error ? err.message : 'Failed to start benchmark');
    } finally {
      setContainerStatus('');
    }
  };

  const handleSaveLogs = async (filename: string) => {
    if (!activeContainer) return;
    try {
      await saveLogs(activeContainer, filename);
    } catch (err) {
      console.error("Error saving logs:", err);
      setError("Failed to save logs");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Benchmark Configuration</h2>
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded p-3 flex items-center mb-4">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span>{error}</span>
          </div>
        )}
        {containerStatus && (
          <div className="bg-blue-900/50 border border-blue-500 rounded p-3 flex items-center mb-4">
            <span className="animate-pulse">{containerStatus}</span>
          </div>
        )}

        {activeContainer && (
          <LogViewer 
            containerId={activeContainer}
            isContainerRunning={isContainerRunning}
            onSaveLogs={handleSaveLogs}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
            <label className="block text-sm mb-1">
              {activeContainer && isContainerRunning ? "Container Running" : "Select NIM"}
            </label>
            <select 
              value={formData.nim_id}
              onChange={e => setFormData({...formData, nim_id: e.target.value})}
              className="w-full bg-gray-700 rounded p-2"
              disabled={!!activeContainer}
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
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Concurrency</label>
              <input
                type="number"
                value={formData.concurrency_level}
                onChange={e => setFormData({...formData, concurrency_level: Number(e.target.value)})}
                className="w-full bg-gray-700 rounded p-2"
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Max Tokens</label>
              <input
                type="number"
                value={formData.max_tokens}
                onChange={e => setFormData({...formData, max_tokens: Number(e.target.value)})}
                className="w-full bg-gray-700 rounded p-2"
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">GPU Count</label>
              <select
                value={formData.gpu_count}
                onChange={e => setFormData({...formData, gpu_count: Number(e.target.value)})}
                className="w-full bg-gray-700 rounded p-2"
              >
                {[1,2,3,4].map(num => (
                  <option key={num} value={num}>{num} GPU{num > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading || !!containerStatus || !!activeContainer}
            className="w-full bg-green-600 hover:bg-green-700 py-2 px-4 rounded disabled:opacity-50"
          >
            {containerStatus || (activeContainer ? "Container Running" : "Start Benchmark")}
          </button>
        </form>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Real-time Metrics</h2>
        {metrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {metrics.gpu_metrics?.map((gpu, i) => (
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
                <Line type="monotone" dataKey="tokens_per_second" name="Tokens/sec" />
                <Line type="monotone" dataKey="latency" name="Latency (ms)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestControls;