import React, { useState } from 'react'
import { Play, Settings2 } from 'lucide-react'

const TestControls = ({ onStartTest }) => {
  const [isAdvanced, setIsAdvanced] = useState(false)
  const [config, setConfig] = useState({
    totalRequests: 100,
    concurrencyLevel: 10,
    maxTokens: 100,
    prompt: "Explain quantum computing briefly"
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onStartTest(config)
  }

  return (
    <div className="card space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Benchmark Configuration</h2>
        <button
          onClick={() => setIsAdvanced(!isAdvanced)}
          className="flex items-center text-gray-400 hover:text-white"
        >
          <Settings2 className="w-4 h-4 mr-2" />
          {isAdvanced ? 'Basic' : 'Advanced'} Settings
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Total Requests
            </label>
            <input
              type="number"
              value={config.totalRequests}
              onChange={(e) => setConfig({ ...config, totalRequests: +e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Concurrency Level
            </label>
            <input
              type="number"
              value={config.concurrencyLevel}
              onChange={(e) => setConfig({ ...config, concurrencyLevel: +e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              min="1"
            />
          </div>

          {isAdvanced && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Max Tokens
              </label>
              <input
                type="number"
                value={config.maxTokens}
                onChange={(e) => setConfig({ ...config, maxTokens: +e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                min="1"
              />
            </div>
          )}

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Prompt
            </label>
            <textarea
              value={config.prompt}
              onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 h-24"
              placeholder="Enter your benchmark prompt here..."
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="btn btn-primary flex items-center"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Benchmark
          </button>
        </div>
      </form>
    </div>
  )
}

export default TestControls
