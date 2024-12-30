import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Monitor, Settings as SettingsIcon, History as HistoryIcon, Home as HomeIcon } from 'lucide-react'
import Home from '@/routes/Home'
import Benchmarks from '@/routes/Benchmarks'
import Settings from '@/routes/Settings'

const NavLink = ({ to, children, icon: Icon }) => {
  const location = useLocation()
  const isActive = location.pathname === to
  
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
  )
}

const App = () => {
  return (
    <Router>
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

          <div className="mt-auto pt-4 border-t border-gray-800">
            <div className="flex items-center space-x-2 px-4 py-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-400">System Ready</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <header className="bg-gray-950 p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold">NVIDIA Inference Manager Benchmarks</h1>
              <div className="flex items-center space-x-4">
                <Link 
                  to="/benchmarks" 
                  className="px-4 py-2 bg-[#76B900] text-white rounded-lg hover:bg-[#88d600] transition-colors"
                >
                  New Benchmark
                </Link>
              </div>
            </div>
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
    </Router>
  )
}

export default App
