import React from 'react'
import { Cpu, HardDrive, Thermometer, Activity, Clock, Zap } from 'lucide-react'

type MetricCardProps = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  value: number | string;
  unit?: string;
  color: string;
}

const MetricCard = ({ icon: Icon, title, value, unit, color }: MetricCardProps) => (
  <div className="bg-gray-800 rounded-lg p-4">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-gray-400 text-sm">{title}</p>
        <div className="flex items-baseline mt-1">
          <p className="text-2xl font-semibold">{value}</p>
          {unit && <p className="ml-1 text-gray-400">{unit}</p>}
        </div>
      </div>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
  </div>
)

type Metrics = {
  tokens_per_second: number;
  requests_per_second: number;
  latency: number;
  gpu_utilization: number;
  memory_used: number;
  memory_total: number;
}

type SystemMetricsProps = {
  metrics: Metrics;
}

const SystemMetrics: React.FC<SystemMetricsProps> = ({ metrics }) => {
  const {
    tokens_per_second,
    requests_per_second,
    latency,
    gpu_utilization,
    memory_used,
    memory_total
  } = metrics

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <MetricCard
        icon={Zap}
        title="Tokens per Second"
        value={tokens_per_second.toFixed(1)}
        unit="tok/s"
        color="text-yellow-400"
      />
      
      <MetricCard
        icon={Activity}
        title="Requests per Second"
        value={requests_per_second.toFixed(1)}
        unit="req/s"
        color="text-blue-400"
      />
      
      <MetricCard
        icon={Clock}
        title="Average Latency"
        value={latency.toFixed(0)}
        unit="ms"
        color="text-purple-400"
      />
      
      <MetricCard
        icon={Cpu}
        title="GPU Utilization"
        value={gpu_utilization.toFixed(0)}
        unit="%"
        color="text-green-400"
      />
      
      <MetricCard
        icon={HardDrive}
        title="Memory Usage"
        value={((memory_used / memory_total) * 100).toFixed(0)}
        unit="%"
        color="text-red-400"
      />
      
      <MetricCard
        icon={Thermometer}
        title="Memory Available"
        value={(memory_total - memory_used).toFixed(1)}
        unit="GB"
        color="text-orange-400"
      />
    </div>
  )
}

export default SystemMetrics
