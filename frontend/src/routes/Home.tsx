import React, { useState, useEffect, useCallback } from 'react'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts'
import { 
  Zap, Server, Cpu, Activity, Gauge, ChevronDown, Database,
  LayoutGrid, Calendar, ArrowUpRight, ArrowDownRight, AlertCircle
} from 'lucide-react'
import useWebSocket from '@/hooks/useWebSocket'

const Home = () => {
  const [timeRange, setTimeRange] = useState('7d')
  const [selectedSystem, setSelectedSystem] = useState('local')
  const [view, setView] = useState('performance')
  const [performanceData, setPerformanceData] = useState([])
  const [gpuData, setGpuData] = useState([])
  const [metrics, setMetrics] = useState({
    tokensPerSecond: 0,
    totalRuns: 0,
    gpuUtilization: 0,
    powerEfficiency: 0,
    weekOverWeekChanges: {
      tokensPerSecond: 0,
      totalRuns: 0,
      gpuUtilization: 0,
      powerEfficiency: 0
    }
  })
  const [recentBenchmarks, setRecentBenchmarks] = useState([])
  const [error, setError] = useState('')

  // WebSocket connection
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const wsUrl = `${protocol}://${window.location.host}/ws`
  const { metrics: wsMetrics, isConnected, error: wsError } = useWebSocket(wsUrl)

  // Update metrics when WebSocket data is received
  useEffect(() => {
    if (wsMetrics) {
      // Update real-time metrics
      setMetrics(prevMetrics => ({
        ...prevMetrics,
        tokensPerSecond: wsMetrics.tokens_per_second || prevMetrics.tokensPerSecond,
        gpuUtilization: wsMetrics.gpu_utilization || prevMetrics.gpuUtilization,
        powerEfficiency: wsMetrics.power_efficiency || prevMetrics.powerEfficiency
      }))

      // Update performance data with new point
      setPerformanceData(prevData => {
        const newPoint = {
          date: new Date().toISOString(),
          nimA: wsMetrics.tokens_per_second,
          nimB: wsMetrics.tokens_per_second * 0.8, // Mock data for other NIMs
          nimC: wsMetrics.tokens_per_second * 0.6
        }
        // Keep last 100 points
        const updatedData = [...prevData, newPoint].slice(-100)
        return updatedData
      })

      // Update GPU data
      if (wsMetrics.gpu_stats) {
        setGpuData(wsMetrics.gpu_stats)
      }
    }
  }, [wsMetrics])

  // Initial data fetch
  const fetchHistoricalData = useCallback(async () => {
    try {
      const response = await fetch('/api/benchmark/history')
      const data = await response.json()
      // Process historical data...
      const processedPerformanceData = data.map(record => ({
        date: new Date(record.timestamp).toISOString(),
        nimA: record.tokens_per_second,
        nimB: record.tokens_per_second * 0.8,
        nimC: record.tokens_per_second * 0.6
      }))
      setPerformanceData(processedPerformanceData)
      setRecentBenchmarks(data.slice(0, 3))
    } catch (error) {
      console.error('Error fetching historical data:', error)
      setError('Failed to load historical data')
    }
  }, [])

  useEffect(() => {
    fetchHistoricalData()
    // Fetch new historical data when timeRange changes
    // In a real app, you'd pass timeRange to the API
  }, [timeRange, fetchHistoricalData])

  const TopCard = ({ title, value, change, icon: Icon }) => (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-gray-400 text-sm">{title}</div>
          <div className="text-2xl font-bold mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          <div className={`text-sm mt-1 flex items-center ${
            change >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {Math.abs(change)}% vs last week
          </div>
        </div>
        <div className="bg-gray-700 p-2 rounded-lg">
          <Icon className="w-5 h-5 text-[#76B900]" />
        </div>
      </div>
    </div>
  )

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
      isConnected ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        isConnected ? 'bg-green-400' : 'bg-red-400'
      }`} />
      {isConnected ? 'Connected' : 'Disconnected'}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <button className="btn bg-gray-800 flex items-center gap-2">
              <Server className="w-4 h-4" />
              Local System
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <ConnectionStatus />
        </div>
        
        {/* Time Range Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {['24h', '7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded ${
                  timeRange === range ? 'bg-[#76B900] text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {(error || wsError) && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-200">{error || wsError}</span>
        </div>
      )}

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TopCard 
          title="Avg Tokens/sec" 
          value={metrics.tokensPerSecond.toFixed(1)} 
          change={metrics.weekOverWeekChanges.tokensPerSecond} 
          icon={Zap}
        />
        <TopCard 
          title="Total Runs" 
          value={metrics.totalRuns} 
          change={metrics.weekOverWeekChanges.totalRuns} 
          icon={Activity}
        />
        <TopCard 
          title="GPU Utilization" 
          value={`${metrics.gpuUtilization}%`} 
          change={metrics.weekOverWeekChanges.gpuUtilization} 
          icon={Cpu}
        />
        <TopCard 
          title="Power Efficiency" 
          value={`${metrics.powerEfficiency}%`} 
          change={metrics.weekOverWeekChanges.powerEfficiency} 
          icon={Gauge}
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Performance by NIM</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData.slice(-20)}> {/* Show last 20 points */}
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF"
                  tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '0.5rem'
                  }}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="nimA" 
                  stroke="#76B900" 
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="nimB" 
                  stroke="#60A5FA" 
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="nimC" 
                  stroke="#F87171" 
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold mb-4">GPU Performance</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gpuData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '0.5rem'
                  }}
                />
                <Legend />
                <Bar dataKey="avgTps" name="Avg TPS" fill="#76B900" />
                <Bar dataKey="powerEfficiency" name="Power Efficiency" fill="#60A5FA" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Recent Benchmarks</h3>
            <button className="text-gray-400 hover:text-white">View All</button>
          </div>
          <div className="space-y-3">
            {recentBenchmarks.map((benchmark) => (
              <div key={benchmark.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-700 p-2 rounded">
                    <Database className="w-5 h-5 text-[#76B900]" />
                  </div>
                  <div>
                    <div className="font-medium">{benchmark.model_name}</div>
                    <div className="text-sm text-gray-400">
                      {benchmark.average_tps.toFixed(1)} tok/s
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {new Date(benchmark.start_time).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">
                    {benchmark.duration}s duration
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold mb-4">Distribution by GPU</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gpuData}
                  dataKey="runs"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                >
                  {gpuData.map((entry, index) => (
                    <Cell key={index} fill={['#76B900', '#60A5FA', '#F87171'][index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '0.5rem'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home

