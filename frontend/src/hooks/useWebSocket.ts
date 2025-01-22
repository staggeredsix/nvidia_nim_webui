// src/hooks/useWebSocket.ts
import { useState, useEffect, useCallback } from "react";
import { MetricsData as IMetricsData } from "../types/metrics";

interface WebSocketState {
 metrics: IMetricsData | null;
 isConnected: boolean;
 error: string | null;
}

interface WebSocketMessage {
 type: string;
 metrics?: IMetricsData;
 progress?: {
   completed: number;
   total: number;
   currentTps: number;
   estimatedTimeRemaining: number;
 };
}

const useWebSocket = (url: string) => {
 const [socket, setSocket] = useState<WebSocket | null>(null);
 const [state, setState] = useState<WebSocketState>({
   metrics: null,
   isConnected: false,
   error: null,
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
        const data: WebSocketMessage = JSON.parse(event.data);
        if (data.type === "metrics_update" && data.metrics) {
          setState(prev => ({
            ...prev,
            metrics: {
              ...prev.metrics,
              ...data.metrics
            }
          }));
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

     ws.onerror = () => {
       setState(prev => ({ ...prev, error: "WebSocket connection error" }));
       ws.close();
     };

     ws.onclose = () => {
       setState(prev => ({ ...prev, isConnected: false }));
       setSocket(null);

       if (retryCount < maxRetries) {
         setTimeout(() => {
           setRetryCount(prev => prev + 1);
           connect();
         }, retryDelay * Math.pow(2, retryCount)); // Exponential backoff
       } else {
         setState(prev => ({
           ...prev,
           error: "Maximum retry attempts reached"
         }));
       }
     };

     setSocket(ws);
     return ws;
   } catch (err) {
     setState(prev => ({
       ...prev,
       error: "Failed to create WebSocket connection"
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

 const sendMessage = useCallback(
   (message: unknown) => {
     if (socket?.readyState === WebSocket.OPEN) {
       socket.send(JSON.stringify(message));
     }
   },
   [socket]
 );

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
   reconnect,
 };
};

export default useWebSocket;