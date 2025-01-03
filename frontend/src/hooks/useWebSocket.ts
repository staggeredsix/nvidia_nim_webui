import { useState, useEffect, useCallback } from 'react';

interface MetricsData {
 tokens_per_second: number;
 gpu_utilization: number;
 power_efficiency: number;
 gpu_memory?: number;
 gpu_temp?: number;
 timestamp?: string;
}

interface WebSocketState {
 metrics: MetricsData | null;
 isConnected: boolean;
 error: string | null;
}

const useWebSocket = (url: string) => {
 const [socket, setSocket] = useState<WebSocket | null>(null);
 const [state, setState] = useState<WebSocketState>({
   metrics: null,
   isConnected: false,
   error: null
 });
 const [retryCount, setRetryCount] = useState(0);
 const maxRetries = 5;
 const retryDelay = 2000;

 const connect = useCallback(() => {
   try {
     const ws = new WebSocket(url);

     ws.onopen = () => {
       setState(prev => ({ ...prev, isConnected: true, error: null }));
       setRetryCount(0);
     };

     ws.onmessage = (event) => {
       try {
         const data = JSON.parse(event.data);
         if (data.type === 'metrics_update') {
           setState(prev => ({ ...prev, metrics: data.metrics }));
         }
       } catch (err) {
         console.error('Failed to parse WebSocket message:', err);
       }
     };

     ws.onerror = (error) => {
       setState(prev => ({ ...prev, error: 'WebSocket connection error' }));
       ws.close();
     };

     ws.onclose = () => {
       setState(prev => ({ ...prev, isConnected: false }));
       setSocket(null);

       if (retryCount < maxRetries) {
         setTimeout(() => {
           setRetryCount(prev => prev + 1);
           connect();
         }, retryDelay);
       } else {
         setState(prev => ({ 
           ...prev, 
           error: 'Maximum retry attempts reached'
         }));
       }
     };

     setSocket(ws);
     return ws;
     
   } catch (err) {
     setState(prev => ({ 
       ...prev, 
       error: 'Failed to create WebSocket connection'
     }));
     return null;
   }
 }, [url, retryCount]);

 useEffect(() => {
   const ws = connect();
   return () => {
     if (ws && ws.readyState === WebSocket.OPEN) {
       ws.close();
     }
   };
 }, [connect]);

 const sendMessage = useCallback((message: any) => {
   if (socket?.readyState === WebSocket.OPEN) {
     socket.send(JSON.stringify(message));
   }
 }, [socket]);

 const reconnect = useCallback(() => {
   if (socket) {
     socket.close();
   }
   setRetryCount(0);
   connect();
 }, [socket, connect]);

 return {
   metrics: state.metrics,
   isConnected: state.isConnected, 
   error: state.error,
   sendMessage,
   reconnect
 };
};

interface MetricsData {
  tokens_per_second: number;
  gpu_utilization: number;
  power_efficiency: number;
  gpu_memory?: number;
  gpu_temp?: number;
  timestamp?: string;
  gpu_stats?: Array<{
    name: string;
    avgTps: number;
    powerEfficiency: number;
    runs: number;
  }>;
}

export default useWebSocket;
