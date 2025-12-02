// src/components/TestControls.tsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, Plus, X, Upload } from 'lucide-react';
import LogViewer from '@/components/LogViewer';
import { startBenchmark, getNims, saveLogs, fetchBenchmarkHistory, setupNgcModel } from "@/services/api";
import type { BenchmarkConfig, BenchmarkRun } from '@/types/benchmark';
import type { ContainerInfo, NgcModelSetupResponse } from '@/services/api';
import BenchmarkHistory from '@/components/BenchmarkHistory';

const providerOptions = [
  { value: 'llama.cpp', label: 'llama.cpp' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'sglang', label: 'sgLang' },
  { value: 'vllm', label: 'vLLM' },
];

const backendDefaults = ['llama.cpp', 'ollama', 'sglang', 'vllm'];

interface TargetConfig {
  mode: 'nim' | 'external';
  nim_id?: string;
  gpu_count?: number;
  provider?: string;
  endpoint?: string;
  model_name?: string;
  quantization?: string;
  port?: number;
  streaming: boolean;
  customPrompt?: string;
  expected_output?: string;
}

const TestControls = () => {
  const [baseConfig, setBaseConfig] = useState({
    name: '',
    description: '',
    total_requests: 100,
    concurrency_level: 10,
    max_tokens: 50,
    prompt: '',
  });

  const [targets, setTargets] = useState<TargetConfig[]>([{
    mode: 'nim',
    nim_id: '',
    gpu_count: 1,
    streaming: true,
    quantization: 'default',
  }]);

  const [nims, setNims] = useState<ContainerInfo[]>([]);
  const [error, setError] = useState('');
  const [containerStatus, setContainerStatus] = useState('');
  const [activeContainer, setActiveContainer] = useState<string | null>(null);
  const [isContainerRunning, setIsContainerRunning] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkRun[]>([]);
  const [ngcForm, setNgcForm] = useState({
    source: '',
    model_name: '',
    backends: backendDefaults,
    overwrite: false,
  });
  const [ngcStatus, setNgcStatus] = useState('');
  const [ngcResult, setNgcResult] = useState<NgcModelSetupResponse | null>(null);

  useEffect(() => {
    loadNims();
    loadBenchmarkHistory();
    const interval = setInterval(loadNims, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadNims = async () => {
    try {
      const nimData = await getNims();
      setNims(nimData);
      if (activeContainer) {
        const activeNim = nimData.find(nim => nim.container_id === activeContainer);
        setIsContainerRunning(activeNim?.status === 'running');
      }
    } catch (err) {
      console.error("Error loading NIMs:", err);
      setError("Failed to load NIMs");
    }
  };

  const loadBenchmarkHistory = async () => {
    try {
      const history = await fetchBenchmarkHistory();
      setBenchmarkHistory(history);
    } catch (err) {
      console.error("Error loading benchmark history:", err);
    }
  };

  const addTarget = () => {
    setTargets([...targets, { mode: 'external', streaming: true, quantization: 'default', port: 8000 }]);
  };

  const updateTarget = (index: number, config: Partial<TargetConfig>) => {
    const newConfigs = [...targets];
    newConfigs[index] = { ...newConfigs[index], ...config };
    setTargets(newConfigs);
  };

  const removeTarget = (index: number) => {
    setTargets(targets.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setContainerStatus('Starting benchmarks...');

    for (const target of targets) {
      try {
        if (!baseConfig.name.trim()) {
          setError('Please provide a benchmark name');
          return;
        }

        const prompt = (target.customPrompt ?? baseConfig.prompt).trim();
        if (!prompt) {
          setError('Please provide a prompt');
          return;
        }

        const fullConfig: BenchmarkConfig = {
          ...baseConfig,
          prompt,
          stream: target.streaming,
          quantization: target.quantization,
        } as BenchmarkConfig;

        if (target.mode === 'nim') {
          if (!target.nim_id) {
            setError('Please select a NIM');
            return;
          }

          fullConfig.nim_id = target.nim_id;
          fullConfig.gpu_count = target.gpu_count || 1;
          fullConfig.name = `${baseConfig.name}_${nims.find(n => n.container_id === target.nim_id)?.image_name.split('/').pop() || 'nim'}`;
        } else {
          if (!target.provider || !target.model_name) {
            setError('Please choose a provider and model name');
            return;
          }
          fullConfig.provider = target.provider;
          fullConfig.model_name = target.model_name;
          fullConfig.endpoint = target.endpoint;
          fullConfig.quantization = target.quantization || 'default';
          fullConfig.port = target.port || 8000;
          fullConfig.expected_output = target.expected_output;
          fullConfig.name = `${baseConfig.name}_${target.provider}_${target.model_name}`;
        }

        setContainerStatus(`Running benchmark for ${fullConfig.name}...`);

        const response = await startBenchmark(fullConfig);
        if (response.container_id) {
          setActiveContainer(response.container_id);
        }
        setMetrics(response.metrics);

        await loadBenchmarkHistory();
      } catch (err) {
        console.error("Error starting benchmark:", err);
        setError(err instanceof Error ? err.message : 'Failed to start benchmark');
        break;
      }
    }

    setContainerStatus('');
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

  const toggleBackendSelection = (backend: string) => {
    setNgcForm(prev => {
      const exists = prev.backends.includes(backend);
      return {
        ...prev,
        backends: exists ? prev.backends.filter(b => b !== backend) : [...prev.backends, backend],
      };
    });
  };

  const handleNgcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNgcStatus('Preparing model with ngc-cli...');
    setNgcResult(null);
    try {
      const result = await setupNgcModel(ngcForm);
      setNgcResult(result);
      setNgcStatus('Model prepared for all selected backends.');
    } catch (err) {
      console.error(err);
      setNgcStatus(err instanceof Error ? err.message : 'Failed to prepare model');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Run a Benchmark</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Benchmark Configuration</h2>
          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded p-3 flex items-center mb-4">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input
                type="text"
                value={baseConfig.name}
                onChange={e => setBaseConfig({...baseConfig, name: e.target.value})}
                className="w-full bg-gray-700 rounded p-2"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Description</label>
              <input
                type="text"
                value={baseConfig.description}
                onChange={e => setBaseConfig({...baseConfig, description: e.target.value})}
                className="w-full bg-gray-700 rounded p-2"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Default Prompt Template</label>
              <textarea
                value={baseConfig.prompt}
                onChange={e => setBaseConfig({...baseConfig, prompt: e.target.value})}
                className="w-full bg-gray-700 rounded p-2"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Total Requests</label>
                <input
                  type="number"
                  value={baseConfig.total_requests}
                  onChange={e => setBaseConfig({...baseConfig, total_requests: Number(e.target.value)})}
                  className="w-full bg-gray-700 rounded p-2"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Concurrency</label>
                <input
                  type="number"
                  value={baseConfig.concurrency_level}
                  onChange={e => setBaseConfig({...baseConfig, concurrency_level: Number(e.target.value)})}
                  className="w-full bg-gray-700 rounded p-2"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Max Tokens</label>
                <input
                  type="number"
                  value={baseConfig.max_tokens}
                  onChange={e => setBaseConfig({...baseConfig, max_tokens: Number(e.target.value)})}
                  className="w-full bg-gray-700 rounded p-2"
                  min={1}
                />
              </div>
            </div>

            <div className="space-y-4">
              {targets.map((target, index) => (
                <div key={index} className="bg-gray-700/50 p-4 rounded-lg space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-sm mb-1">Target Type</label>
                      <select
                        value={target.mode}
                        onChange={e => updateTarget(index, { mode: e.target.value as TargetConfig['mode'] })}
                        className="w-full bg-gray-700 rounded p-2"
                      >
                        <option value="nim">NIM Container</option>
                        <option value="external">External Provider</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm mb-1">Quantization</label>
                      <select
                        value={target.quantization || 'default'}
                        onChange={e => updateTarget(index, { quantization: e.target.value })}
                        className="w-full bg-gray-700 rounded p-2"
                      >
                        <option value="default">Default</option>
                        <option value="nvfp4">NVFP4</option>
                      </select>
                    </div>

                    {targets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTarget(index)}
                        className="mt-6 text-gray-400 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {target.mode === 'nim' ? (
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-sm mb-1">Select NIM</label>
                        <select
                          value={target.nim_id}
                          onChange={e => updateTarget(index, { nim_id: e.target.value })}
                          className="w-full bg-gray-700 rounded p-2"
                        >
                          <option value="">Select NIM</option>
                          {nims.map(n => (
                            <option key={n.container_id || n.image_name} value={n.container_id || n.image_name}>
                              {n.image_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm mb-1">GPUs</label>
                        <select
                          value={target.gpu_count || 1}
                          onChange={e => updateTarget(index, { gpu_count: Number(e.target.value) })}
                          className="w-full bg-gray-700 rounded p-2"
                        >
                          {[1,2,3,4].map(num => (
                            <option key={num} value={num}>{num} GPU{num > 1 ? 's' : ''}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm mb-1">Provider</label>
                          <select
                            value={target.provider || ''}
                            onChange={e => updateTarget(index, { provider: e.target.value })}
                            className="w-full bg-gray-700 rounded p-2"
                          >
                            <option value="">Select provider</option>
                            {providerOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Endpoint</label>
                          <input
                            type="text"
                            placeholder="http://localhost:8000"
                            value={target.endpoint || ''}
                            onChange={e => updateTarget(index, { endpoint: e.target.value })}
                            className="w-full bg-gray-700 rounded p-2"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm mb-1">Model Name</label>
                          <input
                            type="text"
                            value={target.model_name || ''}
                            onChange={e => updateTarget(index, { model_name: e.target.value })}
                            className="w-full bg-gray-700 rounded p-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Port (optional)</label>
                          <input
                            type="number"
                            value={target.port || 8000}
                            onChange={e => updateTarget(index, { port: Number(e.target.value) })}
                            className="w-full bg-gray-700 rounded p-2"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Expected Output (for accuracy)</label>
                        <input
                          type="text"
                          value={target.expected_output || ''}
                          onChange={e => updateTarget(index, { expected_output: e.target.value })}
                          className="w-full bg-gray-700 rounded p-2"
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`streaming-${index}`}
                        checked={target.streaming}
                        onChange={e => updateTarget(index, { streaming: e.target.checked })}
                        className="rounded bg-gray-700 border-gray-600"
                      />
                      <label htmlFor={`streaming-${index}`} className="text-sm">Enable streaming</label>
                    </div>

                    <button
                      type="button"
                      onClick={() => updateTarget(index, {
                        customPrompt: target.customPrompt === undefined ? baseConfig.prompt : undefined
                      })}
                      className="text-gray-400 hover:text-white text-sm"
                    >
                      {target.customPrompt === undefined ? "Add custom prompt" : "Remove custom prompt"}
                    </button>

                    {target.customPrompt !== undefined && (
                      <textarea
                        value={target.customPrompt}
                        onChange={e => updateTarget(index, { customPrompt: e.target.value })}
                        placeholder="Enter custom prompt for this target..."
                        className="w-full bg-gray-700 rounded p-2 text-sm"
                        rows={3}
                      />
                    )}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addTarget}
                className="flex items-center text-gray-400 hover:text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add another target
              </button>
            </div>

            <button
              type="submit"
              disabled={!!containerStatus || !!activeContainer}
              className="w-full bg-green-600 hover:bg-green-700 py-2 px-4 rounded disabled:opacity-50"
            >
              {containerStatus || (activeContainer ? "Benchmark Running..." : "Start Benchmarks")}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Recent Benchmarks</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={benchmarkHistory.slice(-10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="start_time"
                  tick={{ fill: '#9CA3AF' }}
                  tickFormatter={(val) => new Date(val).toLocaleTimeString()}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: '#9CA3AF' }}
                  label={{ value: 'Tokens/s', angle: -90, position: 'insideLeft' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#9CA3AF' }}
                  label={{ value: 'Latency (s)', angle: 90, position: 'insideRight' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                  labelFormatter={(val) => new Date(val).toLocaleString()}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="metrics.tokens_per_second"
                  name="Tokens/s"
                  stroke="#10B981"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="metrics.latency"
                  name="Latency"
                  stroke="#60A5FA"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {metrics && (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">System Metrics</h2>
              <div className="grid grid-cols-2 gap-4">
                {metrics.gpu_metrics.map((gpu: any, index: number) => (
                  <div key={index} className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">GPU {index}</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Temperature</span>
                        <span>{gpu.gpu_temp}°C</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Utilization</span>
                        <span>{gpu.gpu_utilization}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Memory</span>
                        <span>{gpu.gpu_memory_used}/{gpu.gpu_memory_total ?? 'N/A'} GB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Power</span>
                        <span>{gpu.power_draw}W</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BenchmarkHistory />

        <div className="bg-gray-800 p-6 rounded-lg space-y-4">
          <h2 className="text-xl font-bold">Prepare NGC Model for llama.cpp, Ollama, sgLang, and vLLM</h2>
          <p className="text-sm text-gray-300">Download with ngc-cli and auto-create per-backend folders so you can point each server at the right model assets.</p>
          <form onSubmit={handleNgcSubmit} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">NGC Model (e.g. nvidia/llama2_70b:1.0)</label>
              <input
                type="text"
                value={ngcForm.source}
                onChange={e => setNgcForm({...ngcForm, source: e.target.value})}
                className="w-full bg-gray-700 rounded p-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Local Model Name</label>
              <input
                type="text"
                value={ngcForm.model_name}
                onChange={e => setNgcForm({...ngcForm, model_name: e.target.value})}
                className="w-full bg-gray-700 rounded p-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Backends</label>
              <div className="flex flex-wrap gap-3">
                {backendDefaults.map((backend) => (
                  <label key={backend} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={ngcForm.backends.includes(backend)}
                      onChange={() => toggleBackendSelection(backend)}
                      className="rounded bg-gray-700 border-gray-600"
                    />
                    <span>{backend}</span>
                  </label>
                ))}
              </div>
            </div>
            <label className="inline-flex items-center text-sm space-x-2">
              <input
                type="checkbox"
                checked={ngcForm.overwrite}
                onChange={e => setNgcForm({...ngcForm, overwrite: e.target.checked})}
                className="rounded bg-gray-700 border-gray-600"
              />
              <span>Overwrite existing model directory</span>
            </label>

            <button
              type="submit"
              className="flex items-center bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded"
            >
              <Upload className="w-4 h-4 mr-2" />
              Prepare model
            </button>
          </form>
          {ngcStatus && <p className="text-sm text-gray-200">{ngcStatus}</p>}
          {ngcResult && (
            <div className="bg-gray-700/50 p-3 rounded">
              <p className="text-sm font-semibold">Model location: {ngcResult.target_root}</p>
              <div className="mt-2 space-y-2">
                {Object.entries(ngcResult.backends).map(([backend, cfg]) => (
                  <div key={backend} className="text-sm">
                    <p className="font-semibold">{backend}</p>
                    <p className="text-gray-300">Path: {cfg.model_dir}</p>
                    <p className="text-gray-300">Launch: {cfg.launch_example}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {activeContainer && (
        <LogViewer
          containerId={activeContainer}
          isContainerRunning={isContainerRunning}
          onSaveLogs={handleSaveLogs}
          gpuInfo={metrics?.gpu_metrics}
        />
      )}
    </div>
  );
};

export default TestControls;
