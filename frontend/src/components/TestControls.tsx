import React, { useState } from "react";
import { startBenchmark, BenchmarkConfig } from "../services/api";

interface TestControlsProps {
  onStartTest: (config: BenchmarkConfig) => Promise<void>;
}

const TestControls: React.FC<TestControlsProps> = ({ onStartTest }) => {
  const [totalRequests, setTotalRequests] = useState(100);
  const [concurrencyLevel, setConcurrencyLevel] = useState(10);
  const [maxTokens, setMaxTokens] = useState(50);
  const [prompt, setPrompt] = useState("Translate the following text:");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartTest = async () => {
    setIsSubmitting(true);
    const config = {
      total_requests: totalRequests,
      concurrency_level: concurrencyLevel,
      max_tokens: maxTokens,
      prompt,
    };

    try {
      await onStartTest(config);
      alert("Benchmark started successfully!");
    } catch (error) {
      console.error("Failed to start benchmark:", error);
      alert("Failed to start benchmark. Please check the configuration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg space-y-4">
      <h2 className="text-xl font-bold">Test Controls</h2>

      <div className="flex flex-col space-y-2">
        <label className="flex flex-col">
          <span>Total Requests:</span>
          <input
            type="number"
            value={totalRequests}
            onChange={(e) => setTotalRequests(Number(e.target.value))}
            className="p-2 bg-gray-700 rounded"
            min={1}
          />
        </label>

        <label className="flex flex-col">
          <span>Concurrency Level:</span>
          <input
            type="number"
            value={concurrencyLevel}
            onChange={(e) => setConcurrencyLevel(Number(e.target.value))}
            className="p-2 bg-gray-700 rounded"
            min={1}
          />
        </label>

        <label className="flex flex-col">
          <span>Max Tokens:</span>
          <input
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
            className="p-2 bg-gray-700 rounded"
            min={1}
          />
        </label>

        <label className="flex flex-col">
          <span>Prompt:</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="p-2 bg-gray-700 rounded"
          />
        </label>
      </div>

      <button
        onClick={handleStartTest}
        disabled={isSubmitting}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {isSubmitting ? "Starting..." : "Start Benchmark"}
      </button>
    </div>
  );
};

export default TestControls;
