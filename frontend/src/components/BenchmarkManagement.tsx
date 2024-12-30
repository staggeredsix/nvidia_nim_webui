import { useState } from "react";
import { startBenchmark } from "@/services/api"; // Corrected import

const BenchmarkManagement = () => {
  const [config, setConfig] = useState({
    total_requests: 100,
    concurrency_level: 10,
    max_tokens: 50,
    timeout: 30,
    prompt: "Explain quantum computing briefly",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await startBenchmark(config);
      console.log("Benchmark started:", response.run_id);
    } catch (error) {
      console.error("Error starting benchmark:", error);
    }
  };

  return (
    <div>
      <h2>Benchmark Management</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="number"
          value={config.total_requests}
          onChange={(e) =>
            setConfig({ ...config, total_requests: +e.target.value })
          }
          placeholder="Total Requests"
        />
        <input
          type="number"
          value={config.concurrency_level}
          onChange={(e) =>
            setConfig({ ...config, concurrency_level: +e.target.value })
          }
          placeholder="Concurrency Level"
        />
        <input
          type="number"
          value={config.max_tokens}
          onChange={(e) =>
            setConfig({ ...config, max_tokens: +e.target.value })
          }
          placeholder="Max Tokens"
        />
        <input
          type="number"
          value={config.timeout}
          onChange={(e) => setConfig({ ...config, timeout: +e.target.value })}
          placeholder="Timeout"
        />
        <input
          type="text"
          value={config.prompt}
          onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
          placeholder="Prompt"
        />
        <button type="submit">Start Benchmark</button>
      </form>
    </div>
  );
};

export default BenchmarkManagement;

