import React, { useState, useEffect } from "react"
import { AlertCircle } from "lucide-react"
import TestControls from "@/components/TestControls"
import BenchmarkHistory from "@/components/BenchmarkHistory"
import SystemMetrics from "@/components/SystemMetrics"

const Benchmarks = () => {
  const [selectedNim, setSelectedNim] = useState("")
  const [installedNims, setInstalledNims] = useState([])
  const [error, setError] = useState("")

  useEffect(() => {
    fetchNims()
  }, [])

  const fetchNims = async () => {
    try {
      const response = await fetch("/api/nims")
      const data = await response.json()
      setInstalledNims(data)
      if (data.length > 0 && !selectedNim) {
        setSelectedNim(data[0].container_id)
      }
    } catch (error) {
      console.error("Error fetching NIMs:", error)
      setError("Failed to fetch installed NIMs")
    }
  }

  const handleStartTest = async (config) => {
    if (!selectedNim) {
      setError("Please select a NIM to run the benchmark against")
      return
    }

    try {
      const response = await fetch("/api/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          nim_id: selectedNim
        }),
      })
      const data = await response.json()
      console.log("Benchmark started:", data)
    } catch (error) {
      console.error("Error starting benchmark:", error)
      setError("Failed to start benchmark")
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span>{error}</span>
        </div>
      )}

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Select NIM</h2>
        <select
          value={selectedNim}
          onChange={(e) => setSelectedNim(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"
        >
          <option value="">Select a NIM...</option>
          {installedNims.map((nim) => (
            <option key={nim.container_id} value={nim.container_id}>
              {nim.image_name} (Port: {nim.port})
            </option>
          ))}
        </select>
      </div>

      <TestControls onStartTest={handleStartTest} />
      <SystemMetrics
        metrics={{
          tokens_per_second: 50,
          latency: 120,
          requests_per_second: 10,
          gpu_utilization: 80,
          memory_used: 65,
          memory_total: 100,
        }}
      />
      <BenchmarkHistory />
    </div>
  )
}

export default Benchmarks
