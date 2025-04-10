import React, { useState, useEffect } from 'react';
import { Download, X, Search, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { getModels, searchModels, pullModel, deleteModel, getModelHealth } from '@/services/api';
import { OllamaModel, ModelHealth } from '@/types/model';

const ModelManagement: React.FC = () => {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OllamaModel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [modelHealth, setModelHealth] = useState<Record<string, ModelHealth>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const modelList = await getModels();
      setModels(modelList);
      
      // Check health for each model
      const healthChecks: Record<string, ModelHealth> = {};
      for (const model of modelList) {
        try {
          const health = await getModelHealth(model.name);
          healthChecks[model.name] = health;
        } catch (err) {
          healthChecks[model.name] = { status: "unhealthy", error: "Could not check health" };
        }
      }
      setModelHealth(healthChecks);
      
      setError(null);
    } catch (err) {
      setError("Failed to load models. Make sure Ollama is running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setIsSearching(true);
      const results = await searchModels(searchQuery);
      setSearchResults(results);
    } catch (err) {
      setError("Failed to search models");
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePullModel = async (modelName: string) => {
    try {
      setDownloading(modelName);
      await pullModel(modelName);
      setTimeout(() => {
        fetchModels();
        setDownloading(null);
      }, 2000);
    } catch (err) {
      setError(`Failed to download model: ${modelName}`);
      console.error(err);
      setDownloading(null);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    if (!confirm(`Are you sure you want to delete the model ${modelName}?`)) return;
    
    try {
      await deleteModel(modelName);
      fetchModels();
    } catch (err) {
      setError(`Failed to delete model: ${modelName}`);
      console.error(err);
    }
  };

  // Format file size to human readable format
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Model Management</h2>
        <button
          onClick={fetchModels}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded p-3 text-sm flex items-center">
          <AlertTriangle size={16} className="mr-2 text-red-400" />
          {error}
        </div>
      )}

      {/* Search Model Section */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="font-medium mb-4">Search Ollama Library</h3>
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models (e.g., llama, mistral, yi)..."
              className="w-full bg-gray-700 rounded-lg pl-10 pr-4 py-2"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-blue-600 hover:bg-blue-700 px-4 rounded-lg text-white disabled:opacity-50"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">Search Results</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchResults.map(model => (
                <div 
                  key={model.model_id} 
                  className="bg-gray-700 p-3 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">{model.name}</div>
                    {model.description && (
                      <div className="text-sm text-gray-400 line-clamp-2">{model.description}</div>
                    )}
                    {model.size > 0 && (
                      <div className="text-xs text-gray-500">{formatFileSize(model.size)}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handlePullModel(model.name)}
                    disabled={downloading === model.name}
                    className="ml-2 bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-white text-sm disabled:opacity-50 min-w-[90px] text-center"
                  >
                    {downloading === model.name ? "Downloading..." : "Download"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Installed Models */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="font-medium mb-4">Installed Models</h3>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : models.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Download size={24} className="mx-auto mb-2" />
            <p>No models installed</p>
            <p className="text-sm text-gray-500">Search and download models using the form above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {models.map(model => (
              <div key={model.model_id} className="bg-gray-700 p-3 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{model.name}</div>
                    <div className="text-xs text-gray-400">
                      {model.modified_at && `Modified: ${new Date(model.modified_at).toLocaleString()}`}
                    </div>
                    {model.size > 0 && (
                      <div className="text-xs text-gray-400">Size: {formatFileSize(model.size)}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {modelHealth[model.name] && (
                      <div className={`px-2 py-1 rounded text-xs ${
                        modelHealth[model.name].status === 'healthy' 
                          ? 'bg-green-900/50 text-green-300' 
                          : 'bg-yellow-900/50 text-yellow-300'
                      }`}>
                        {modelHealth[model.name].status === 'healthy' ? (
                          <div className="flex items-center gap-1">
                            <Check size={12} />
                            <span>Healthy</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <AlertTriangle size={12} />
                            <span>Issue</span>
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteModel(model.name)}
                      className="p-1 text-gray-400 hover:text-red-400"
                      title="Delete model"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
                
                {/* Health details if available */}
                {modelHealth[model.name]?.status === 'healthy' && modelHealth[model.name]?.tokens_per_second && (
                  <div className="mt-2 text-xs text-gray-400">
                    Performance: ~{modelHealth[model.name].tokens_per_second?.toFixed(1)} tokens/sec
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelManagement;
