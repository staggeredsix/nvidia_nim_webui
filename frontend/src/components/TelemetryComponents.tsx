import React from 'react';
import { Select } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getNims } from '@/services/api';
import useWebSocket from '@/hooks/useWebSocket';

const GpuMetricsCard = ({ gpuIndex, metrics }) => {
  const {
    gpu_utilization,
    gpu_memory_used,
    gpu_memory_total,
    gpu_temp,
    power_draw
  } = metrics;

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-medium mb-2">GPU {gpuIndex}</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Utilization:</span>
          <span>{gpu_utilization}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Memory:</span>
          <span>{gpu_memory_used}/{gpu_memory_total} GB</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Temperature:</span>
          <span>{gpu_temp}°C</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Power:</span>
          <span>{power_draw}W</span>
        </div>
      </div>
    </div>
  );
};

const BenchmarkConfiguration = () => {
  const [nims, setNims] = useState([]);
  const [selectedNim, setSelectedNim] = useState('');
  const [gpuCount, setGpuCount] = useState(1);
  const [config, setConfig] = useState({
    name: '',
    totalRequests: 1000,
    maxTokens: 100,
    prompt: '',
  });

  useEffect(() => {
    const loadNims = async () => {
      const nimsData = await getNims();
      setNims(nimsData);
    };
    loadNims();
  }, []);

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Benchmark Name"
          className="w-full bg-gray-700 rounded-lg p-2"
          value={config.name}
          onChange={e => setConfig({...config, name: e.target.value})}
        />
        
        <Select
          value={selectedNim}
          onChange={e => setSelectedNim(e.target.value)}
          className="w-full bg-gray-700 rounded-lg"
        >
          <option value="">Select NIM</option>
          {nims.map(nim => (
            <option key={nim.container_id} value={nim.container_id}>
              {nim.image_name}
            </option>
          ))}
        </Select>

        <Select
          value={gpuCount}
          onChange={e => setGpuCount(Number(e.target.value))}
          className="w-full bg-gray-700 rounded-lg"
        >
          {[1,2,3,4].map(num => (
            <option key={num} value={num}>{num} GPU{num > 1 ? 's' : ''}</option>
          ))}
        </Select>

        {/* Additional config inputs */}
      </div>
    </div>
  );
};

const TelemetryDisplay = () => {
  const { metrics } = useWebSocket('ws://localhost:8000/metrics');
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Dynamic GPU grid based on active GPUs */}
        {Array.from({length: metrics?.gpu_count || 1}).map((_, idx) => (
          <GpuMetricsCard 
            key={idx}
            gpuIndex={idx}
            metrics={metrics?.gpu_metrics?.[idx] || {}}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">System Metrics</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">CPU Usage:</span>
              <span>{metrics?.cpu_usage}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Memory:</span>
              <span>{metrics?.memory_used}/{metrics?.memory_total} GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tokens/Watt:</span>
              <span>{metrics?.tokens_per_watt}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">Benchmark Metrics</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Throughput:</span>
              <span>{metrics?.tokens_per_second} tokens/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Latency:</span>
              <span>{metrics?.latency} ms</span>
            </div>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={metrics?.historical || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="tokens_per_second" stroke="#82ca9d" />
            <Line type="monotone" dataKey="latency" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export { BenchmarkConfiguration, TelemetryDisplay };