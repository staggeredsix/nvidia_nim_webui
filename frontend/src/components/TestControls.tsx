// src/components/TestControls.tsx
import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { startBenchmark, getNims } from "../services/api";

interface TestControlsProps {
  isLoading?: boolean;
}

interface Nim {
  container_id: string;
  image_name: string;
  status: string;
}

const TestControls: React.FC<TestControlsProps> = ({ isLoading }) => {
  const [nims, setNims] = useState<Nim[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    totalRequests: 100,
    concurrencyLevel: 10,
    maxTokens: 50,
    prompt: 'Translate the following text:',
    nimId: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const loadNims = async () => {
      try {
        const nimData = await getNims();
        setNims(nimData);
      } catch (err) {
        console.error("Error loading NIMs:", err);
        setError("Failed to load NIMs");
      }
    };
    
    loadNims();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Please provide a benchmark name');
      return;
    }

    if (!formData.nimId) {
      setError('Please select a NIM');
      return;
    }

    try {
      const response = await startBenchmark({
        total_requests: formData.totalRequests,
        concurrency_level: formData.concurrencyLevel,
        max_tokens: formData.maxTokens,
        prompt: formData.prompt,
        name: formData.name,
        description: formData.description,
        nim_id: formData.nimId
      });
      console.log("Benchmark started:", response);
    } catch (err) {
      console.error("Error starting benchmark:", err);
      setError(err instanceof Error ? err.message : 'Failed to start benchmark');
    }
  };

  return (
    <div className="space-y-6 bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold">New Benchmark</h2>

      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded p-3 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Benchmark Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full bg-gray-700 rounded px-3 py-2 border border-gray-600 focus:border-green-500"
            placeholder="e.g., Production Model v1.0 Performance Test"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full bg-gray-700 rounded px-3 py-2 border border-gray-600 focus:border-green-500 h-24"
            placeholder="Describe the purpose of this benchmark..."
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Select NIM *
          </label>
          <select
            value={formData.nimId}
            onChange={(e) => setFormData(prev => ({ ...prev, nimId: e.target.value }))}
            className="w-full bg-gray-700 rounded px-3 py-2 border border-gray-600 focus:border-green-500"
          >
            <option value="">Select a NIM...</option>
            {nims.map((nim) => (
              <option key={nim.container_id} value={nim.container_id}>
                {nim.image_name} ({nim.status})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Total Requests
            </label>
            <input
              type="number"
              value={formData.totalRequests}
              onChange={(e) => setFormData(prev => ({ ...prev, totalRequests: parseInt(e.target.value) }))}
              className="w-full bg-gray-700 rounded px-3 py-2 border border-gray-600 focus:border-green-500"
              min="1"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Concurrency Level
            </label>
            <input
              type="number"
              value={formData.concurrencyLevel}
              onChange={(e) => setFormData(prev => ({ ...prev, concurrencyLevel: parseInt(e.target.value) }))}
              className="w-full bg-gray-700 rounded px-3 py-2 border border-gray-600 focus:border-green-500"
              min="1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Max Tokens
            </label>
            <input
              type="number" 
              value={formData.maxTokens}
              onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
              className="w-full bg-gray-700 rounded px-3 py-2 border border-gray-600 focus:border-green-500"
              min="1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Prompt Template
          </label>
          <textarea
            value={formData.prompt}
            onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
            className="w-full bg-gray-700 rounded px-3 py-2 border border-gray-600 focus:border-green-500 h-24"
            placeholder="Enter your prompt template..."
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Starting Benchmark...' : 'Start Benchmark'}
        </button>
      </form>
    </div>
  );
};

export default TestControls;