import React, { useState, useEffect } from 'react';
import { Play, Loader, AlertCircle } from 'lucide-react';

interface BenchmarkConfig {
 totalRequests: number;
 concurrencyLevel: number;
 maxTokens: number;
 prompt: string;
}

interface BenchmarkProgress {
 completed: number;
 total: number;
 currentTps: number;
 estimatedTimeRemaining: number;
}

interface TestControlsProps {
 onStartTest: (config: BenchmarkConfig) => Promise<void>;
}

const formatTime = (seconds: number): string => {
 const mins = Math.floor(seconds / 60);
 const secs = Math.floor(seconds % 60);
 return `${mins}m ${secs}s`;
};

const TestControls: React.FC<TestControlsProps> = ({ onStartTest }) => {
 const [config, setConfig] = useState<BenchmarkConfig>({
   totalRequests: 100,
   concurrencyLevel: 10,
   maxTokens: 100,
   prompt: "Explain quantum computing briefly"
 });
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [progress, setProgress] = useState<BenchmarkProgress | null>(null);

 useEffect(() => {
   if (!loading) return;
   
   const ws = new WebSocket(`ws://${window.location.host}/ws/benchmark`);
   
   ws.onmessage = (event) => {
     try {
       const data = JSON.parse(event.data);
       if (data.type === 'benchmark_progress') {
         setProgress(data.progress);
       }
     } catch (err) {
       console.error('Failed to parse progress update:', err);
     }
   };

   ws.onerror = () => {
     setError('Lost connection to benchmark progress');
   };

   return () => ws.close();
 }, [loading]);

 const validate = (): boolean => {
   if (config.totalRequests < 1 || config.concurrencyLevel < 1) {
     setError("Request count and concurrency must be greater than 0");
     return false;
   }
   if (config.concurrencyLevel > config.totalRequests) {
     setError("Concurrency cannot exceed total requests");
     return false;
   }
   if (!config.prompt.trim()) {
     setError("Prompt cannot be empty");
     return false;
   }
   return true;
 };

 const handleSubmit = async (e: React.FormEvent) => {
   e.preventDefault();
   setError(null);
   setProgress(null);
   
   if (!validate()) return;

   setLoading(true);
   try {
     await onStartTest(config);
   } catch (err) {
     setError(err instanceof Error ? err.message : 'Failed to start benchmark');
     setProgress(null);
   } finally {
     setLoading(false);
   }
 };

 const ProgressBar = () => {
   if (!progress) return null;
   const percent = (progress.completed / progress.total) * 100;
   
   return (
     <div className="space-y-2">
       <div className="flex justify-between text-sm">
         <span>{progress.completed} / {progress.total} requests</span>
         <span>{progress.currentTps.toFixed(1)} tok/s</span>
       </div>
       <div className="w-full bg-gray-700 rounded-full h-2">
         <div 
           className="bg-[#76B900] h-2 rounded-full transition-all" 
           style={{ width: `${percent}%` }}
         />
       </div>
       <div className="text-sm text-gray-400">
         Est. time remaining: {formatTime(progress.estimatedTimeRemaining)}
       </div>
     </div>
   );
 };

 return (
   <div className="card space-y-6">
     {error && (
       <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 flex items-center">
         <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
         <span>{error}</span>
       </div>
     )}

     <form onSubmit={handleSubmit} className="space-y-4">
       <div className="grid grid-cols-2 gap-4">
         <div>
           <label className="block text-sm font-medium text-gray-300 mb-1">
             Total Requests
           </label>
           <input
             type="number"
             value={config.totalRequests}
             onChange={e => setConfig(p => ({ ...p, totalRequests: parseInt(e.target.value) }))}
             min={1}
             className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
             disabled={loading}
           />
         </div>
         <div>
           <label className="block text-sm font-medium text-gray-300 mb-1">
             Concurrency Level
           </label>
           <input
             type="number"
             value={config.concurrencyLevel}
             onChange={e => setConfig(p => ({ ...p, concurrencyLevel: parseInt(e.target.value) }))}
             min={1}
             className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
             disabled={loading}
           />
         </div>
         <div>
           <label className="block text-sm font-medium text-gray-300 mb-1">
             Max Tokens
           </label>
           <input
             type="number"
             value={config.maxTokens}
             onChange={e => setConfig(p => ({ ...p, maxTokens: parseInt(e.target.value) }))}
             min={1}
             className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
             disabled={loading}
           />
         </div>
         <div className="col-span-2">
           <label className="block text-sm font-medium text-gray-300 mb-1">
             Prompt
           </label>
           <textarea
             value={config.prompt}
             onChange={e => setConfig(p => ({ ...p, prompt: e.target.value }))}
             className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
             disabled={loading}
           />
         </div>
       </div>

       {loading && <ProgressBar />}

       <button
         type="submit"
         disabled={loading}
         className="btn btn-primary w-full flex items-center justify-center"
       >
         {loading ? (
           <>
             <Loader className="w-4 h-4 mr-2 animate-spin" />
             Running Benchmark...
           </>
         ) : (
           <>
             <Play className="w-4 h-4 mr-2" />
             Start Benchmark
           </>
         )}
       </button>
     </form>
   </div>
 );
};

export default TestControls;
