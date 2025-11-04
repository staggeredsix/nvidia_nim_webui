import React, { useState, useEffect } from 'react'
import { Key, Download, XCircle, RefreshCw } from 'lucide-react'
import type { ContainerInfo } from '@/services/api'

interface NimProgress {
  totalSize: number;
  currentSize: number;
  percent: number;
}

const Settings = () => {
  const [ngcKey, setNgcKey] = useState('')
  const [nimUrl, setNimUrl] = useState('')
  const [installedNims, setInstalledNims] = useState<ContainerInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [pullProgress, setPullProgress] = useState<NimProgress | null>(null)

  useEffect(() => {
    fetchInstalledNims()
    const interval = setInterval(fetchInstalledNims, 30000)
    return () => clearInterval(interval)
  }, [])

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const fetchInstalledNims = async () => {
    try {
      const response = await fetch('/api/nims')
      const data = await response.json()
      setInstalledNims(data)
    } catch (error) {
      console.error('Error fetching NIMs:', error)
      showMessage('error', 'Failed to fetch NIMs')
    }
  }

  const handleSaveKey = async () => {
    try {
      await fetch('/api/ngc-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: ngcKey })
      })
      setNgcKey('')
      showMessage('success', 'NGC key saved successfully')
    } catch (error) {
      console.error('Error saving NGC key:', error)
      showMessage('error', 'Failed to save NGC key')
    }
  }

  const handleDeleteKey = async () => {
    if (!confirm('Are you sure you want to delete the NGC key?')) return
    try {
      await fetch('/api/ngc-key', { method: 'DELETE' })
      showMessage('success', 'NGC key deleted successfully')
    } catch (error) {
      console.error('Error deleting NGC key:', error)
      showMessage('error', 'Failed to delete NGC key')
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleInstallNim = async () => {
    if (!nimUrl) return
    setLoading(true)
    setPullProgress(null)

    try {
      const response = await fetch('/api/nims/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_name: nimUrl })
      })

      if (!response.ok) throw new Error('Failed to start NIM installation')

      // Set up SSE for progress updates
      const eventSource = new EventSource(`/api/nims/pull/progress`)
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        setPullProgress({
          totalSize: data.total_size,
          currentSize: data.current_size,
          percent: (data.current_size / data.total_size) * 100
        })

        if (data.status === 'completed') {
          eventSource.close()
          setLoading(false)
          setPullProgress(null)
          fetchInstalledNims()
          showMessage('success', 'NIM installed successfully')
        }
      }

      eventSource.onerror = () => {
        eventSource.close()
        setLoading(false)
        showMessage('error', 'Failed to install NIM')
      }

    } catch (error) {
      console.error('Error installing NIM:', error)
      showMessage('error', 'Failed to install NIM')
      setLoading(false)
    }
  }

  const stopCurrentNim = async () => {
    if (!confirm('Are you sure you want to force stop the current NIM?')) return
    try {
      const runningNim = installedNims.find(
        (nim) => nim.status === 'running' && Boolean(nim.container_id)
      )

      if (!runningNim || !runningNim.container_id) {
        showMessage('error', 'No running NIM container found')
        return
      }

      await fetch('/api/nims/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ container_id: runningNim.container_id })
      })
      fetchInstalledNims()
      showMessage('success', 'NIM stopped successfully')
    } catch (error) {
      console.error('Error stopping NIM:', error)
      showMessage('error', 'Failed to stop NIM')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {message.text && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg flex items-center space-x-2 ${
          message.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'
        }`}>
          <span>{message.text}</span>
        </div>
      )}

      <div className="card bg-gray-800/50 backdrop-blur">
        <h2 className="text-xl font-bold mb-6 flex items-center">
          <Key className="w-6 h-6 mr-2 text-[#76B900]" />
          NGC Key Management
        </h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={ngcKey}
                onChange={(e) => setNgcKey(e.target.value)}
                placeholder="Enter NGC API Key"
                className="w-full bg-gray-700 rounded-lg px-4 py-2"
              />
            </div>
            <button
              onClick={handleSaveKey}
              disabled={!ngcKey}
              className="btn btn-primary"
            >
              Save Key
            </button>
            <button
              onClick={handleDeleteKey}
              className="btn bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Key
            </button>
          </div>
          <div className="flex items-center text-sm text-gray-400">
            <input
              type="checkbox"
              checked={showKey}
              onChange={(e) => setShowKey(e.target.checked)}
              className="mr-2"
            />
            Show key
          </div>
        </div>
      </div>

      <div className="card bg-gray-800/50 backdrop-blur">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center">
            <Download className="w-6 h-6 mr-2 text-[#76B900]" />
            NIM Management
          </h2>
          <button
            onClick={fetchInstalledNims}
            className="flex items-center text-gray-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh List
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            <input
              type="text"
              value={nimUrl}
              onChange={(e) => setNimUrl(e.target.value)}
              placeholder="e.g., nvcr.io/nim/mistralai/mistral-7b-instruct-v0.3:latest"
              className="flex-1 bg-gray-700 rounded-lg px-4 py-3 border border-gray-600 focus:border-[#76B900] focus:ring-1 focus:ring-[#76B900] transition-colors font-mono"
            />
            
            {pullProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>{formatBytes(pullProgress.currentSize)} / {formatBytes(pullProgress.totalSize)}</span>
                  <span>{pullProgress.percent.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-[#76B900] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${pullProgress.percent}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleInstallNim}
              disabled={loading || !nimUrl}
              className={`btn ${
                loading || !nimUrl ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-[#76B900] hover:bg-[#88d600]'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Installing NIM...
                </div>
              ) : (
                'Install New NIM'
              )}
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Installed NIMs</h3>
            <div className="space-y-2">
              {installedNims.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                  <Download className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                  <p>No NIMs installed</p>
                  <p className="text-sm text-gray-500">Install a NIM using the form above</p>
                </div>
              ) : (
                installedNims.map((nim) => (
                  <div key={nim.container_id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{nim.image_name}</div>
                        <div className="text-sm text-gray-400">Port: {nim.port}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="px-2 py-1 bg-green-900 text-green-300 rounded-full text-sm">
                          Running
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={stopCurrentNim}
            className="w-full btn bg-red-600 hover:bg-red-700 text-white mt-4"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Force Stop Current NIM
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings
