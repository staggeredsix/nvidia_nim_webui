import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Monitor, Settings as SettingsIcon, History as HistoryIcon, Home as HomeIcon } from 'lucide-react';
import Home from '@/routes/Home';
import Benchmarks from '@/routes/Benchmarks';
import Settings from '@/routes/Settings';
import { TelemetryDisplay } from '@/components/TelemetryComponents';
import useWebSocket from '@/hooks/useWebSocket';
const WS_BASE = `ws://${window.location.hostname}:7000`;

const NavLink = ({ to, children, icon: Icon }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
        isActive 
          ? 'bg-[#76B900] text-white' 
          : 'text-gray-300 hover:bg-gray-800'
      }`}
    >
      <Icon className="w-5 h-5 mr-2" />
      <span>{children}</span>
    </Link>
  );
};

const MainLayout = () => {
  const { metrics } = useWebSocket(`${WS_BASE}/ws/metrics`);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-950 p-4 flex flex-col">
        <div className="mb-8">
          <Link to="/" className="flex items-center space-x-2">
            <Monitor className="w-8 h-8 text-[#76B900]" />
            <span className="text-xl font-bold">Benchmark Hub</span>
          </Link>
        </div>
        
        <nav className="space-y-2">
          <NavLink to="/" icon={HomeIcon}>Dashboard</NavLink>
          <NavLink to="/benchmarks" icon={Monitor}>Benchmarks</NavLink>
          <NavLink to="/settings" icon={SettingsIcon}>Settings</NavLink>
        </nav>

        <div className="mt-auto">
          {metrics && (
            <div className="p-4 bg-gray-900 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">GPU Util</span>
                <span>{metrics.avg_gpu_utilization?.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Memory</span>
                <span>{metrics.avg_gpu_memory?.toFixed(1)} GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Power</span>
                <span>{metrics.power_draw?.toFixed(1)} W</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <header className="bg-gray-950 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">NVIDIA vLLM NIM Benchmark Manager</h1>
            {metrics && (
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">TPS:</span>
                  <span className="font-semibold">{metrics.tokens_per_second?.toFixed(1)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Peak:</span>
                  <span className="font-semibold">{metrics.peak_tps?.toFixed(1)}</span>
                </div>
                <Link 
                  to="/benchmarks" 
                  className="px-4 py-2 bg-[#76B900] text-white rounded-lg hover:bg-[#88d600] transition-colors"
                >
                  New Benchmark
                </Link>
              </div>
            )}
          </div>
          {/* System metrics in header */}
          {metrics && (
            <div className="grid grid-cols-4 gap-4 mt-4">
              {metrics.gpu_metrics.map((gpu, index) => (
                <div key={index} className="bg-gray-900 p-3 rounded-lg">
                  <div className="text-sm font-medium mb-2">GPU {index}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-400">Util:</div>
                    <div>{gpu.gpu_utilization?.toFixed(1)}%</div>
                    <div className="text-gray-400">Mem:</div>
                    <div>{gpu.gpu_memory_used?.toFixed(1)} GB</div>
                    <div className="text-gray-400">Temp:</div>
                    <div>{gpu.gpu_temp?.toFixed(0)}°C</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </header>

        <main className="p-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/benchmarks" element={<Benchmarks />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
};

export default App;