import { useState, useEffect, useCallback } from 'react'

interface Metrics {
  tokens_per_second: number
  gpu_utilization: number
  power_efficiency: number
  gpu_stats?: Array<{
    name: string
    avgTps: number
    powerEfficiency: number
    runs: number
  }>
}

const useWebSocket = (url: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 5
  const retryDelay = 2000 // 2 seconds

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url)

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setError(null)
        setRetryCount(0)
        ws.send(JSON.stringify({ type: 'get_metrics' }))
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        setSocket(null)

        // Implement retry logic
        if (retryCount < maxRetries) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1)
            connect()
          }, retryDelay)
        } else {
          setError('Maximum retry attempts reached')
        }
      }

      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
        setError('WebSocket connection error')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'metrics_update') {
            setMetrics(data.metrics)
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err)
        }
      }

      setSocket(ws)

      return ws
    } catch (err) {
      console.error('Error creating WebSocket:', err)
      setError('Failed to create WebSocket connection')
      return null
    }
  }, [url, retryCount])

  useEffect(() => {
    const ws = connect()

    // Cleanup on unmount
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [connect])

  const sendMessage = useCallback((message: any) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
    }
  }, [socket])

  const reconnect = useCallback(() => {
    if (socket) {
      socket.close()
    }
    setRetryCount(0)
    connect()
  }, [socket, connect])

  return {
    metrics,
    isConnected,
    error,
    sendMessage,
    reconnect
  }
}

export default useWebSocket
