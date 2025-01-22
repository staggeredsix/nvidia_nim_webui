// src/components/SystemMetrics.tsx
import React from 'react'
import { BsGpuCard } from "react-icons/bs";
import { MetricsData } from '../types/metrics'
import { Cpu, CircuitBoard, Activity, Clock, Network, Timer, BarChart3, Globe, Calendar, HardDrive } from 'lucide-react'

type MetricCardProps = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  value: number | string | null;
  unit?: string;
  color: string;
}

const MetricCard = ({ icon: Icon, title, value, unit, color }: MetricCardProps) => (
  <div className="relative bg-gray-800 rounded-lg p-4">
    {value === null && (
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
        <span className="text-gray-400">Please wait...</span>
      </div>
    )}
    <div className="flex items-start justify-between">
      <div>
        <p className="text-gray-400 text-sm">{title}</p>
        <div className="flex items-baseline mt-1">
          <p className="text-2xl font-semibold">
            {value !== null ? value : '-'}
          </p>
          {unit && value !== null && <p className="ml-1 text-gray-400">{unit}</p>}
        </div>
      </div>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
  </div>
)

interface SystemMetricsProps {
  metrics: MetricsData;
}

const SystemMetrics: React.FC<SystemMetricsProps> = ({ metrics }) => {
  const currentTime = new Date(metrics.timestamp || Date.now()).toLocaleString();
  
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">System Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.gpu_metrics.map((gpuMetric, index) => (
          <MetricCard
            key={`gpu-${index}`}
            icon={BsGpuCard}
            title={`GPU ${index} Usage`}
            value={gpuMetric.gpu_utilization}
            unit="%"
            color="text-green-400"
          />
        ))}
        
        <MetricCard
          icon={Cpu}
          title="CPU Usage"
          value={metrics.cpu_usage}
          unit="%"
          color="text-blue-400"
        />
        
        <MetricCard
          icon={CircuitBoard}
          title="System Memory"
          value={((metrics.memory_used / metrics.memory_total) * 100).toFixed(1)}
          unit="%"
          color="text-purple-400"
        />
        
        <MetricCard
          icon={Activity}
          title="PCIe Throughput"
          value={metrics.pcie_throughput !== null ? (metrics.pcie_throughput / 1024).toFixed(1) : null}
          unit="GB/s"
          color="text-red-400"
        />
        
        <MetricCard
          icon={Timer}
          title="System Uptime"
          value={Math.floor(metrics.uptime / 3600)}
          unit="hours"
          color="text-indigo-400"
        />
      </div>

      {metrics.benchmark_counts && Object.keys(metrics.benchmark_counts).length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Benchmark Runs per NIM</h3>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(metrics.benchmark_counts).map(([nim, count]) => (
                <div key={nim} className="flex items-center justify-between">
                  <span className="text-gray-300">{nim}</span>
                  <span className="text-green-400 font-semibold">{count} runs</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SystemMetrics