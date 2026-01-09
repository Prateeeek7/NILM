import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { loadsApi, predictionsApi, Load } from '../../services/api';
import { useRealtimeData } from '../../hooks/useRealtimeData';
import { formatPower, formatCurrent } from '../../utils/formatters';
import { Zap, Plus } from 'lucide-react';

export function LoadStatusPanel() {
  const { data: realtimeData } = useRealtimeData();
  const [loads, setLoads] = useState<Load[]>([]);
  const [currentPrediction, setCurrentPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch all loads
  useEffect(() => {
    const fetchLoads = async () => {
      try {
        const data = await loadsApi.getAll(true);
        setLoads(data);
      } catch (err) {
        console.error('Failed to load loads:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLoads();
  }, []);

  // Fetch current prediction
  const { data: predictionData } = useQuery({
    queryKey: ['live-prediction'],
    queryFn: () => predictionsApi.getLive(),
    refetchInterval: 5000, // Update every 5 seconds
  });

  useEffect(() => {
    if (predictionData?.prediction) {
      setCurrentPrediction(predictionData.prediction);
    }
  }, [predictionData]);

  // Determine if a load is running
  const isLoadRunning = (load: Load): boolean => {
    if (!realtimeData?.data) return false;
    
    const sensorData = realtimeData.data;
    
    // If no significant power draw, nothing is running
    if (sensorData.power < 0.1) return false;
    
    // Check if power/current are within expected range for this load
    const powerMatch = 
      load.min_power_watts && load.max_power_watts &&
      load.min_power_watts <= sensorData.power && 
      sensorData.power <= load.max_power_watts;
    
    const currentMatch = 
      load.min_current_amps && load.max_current_amps &&
      load.min_current_amps <= sensorData.current && 
      sensorData.current <= load.max_current_amps;
    
    // If we have a prediction, use it to confirm
    if (currentPrediction) {
      const prediction = currentPrediction;
      // If prediction specifically matches this load ID, it's running
      if (prediction.load_id === load.id) {
        return true;
      }
      // If prediction matches load type and specs match, it's likely this load
      if (prediction.load_type === load.load_type && (powerMatch || currentMatch)) {
        return true;
      }
    }
    
    // If no prediction but specs match, assume it's this load
    if (powerMatch && currentMatch) {
      return true;
    }
    
    return false;
  };

  // Get current power consumption for a running load
  const getCurrentPower = (load: Load): number | null => {
    if (isLoadRunning(load) && realtimeData?.data) {
      return realtimeData.data.power;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
        <div className="flex items-center space-x-3 text-neutral-muted">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-neutral-darker border-t-transparent"></div>
          <span className="text-sm">Loading loads...</span>
        </div>
      </div>
    );
  }

  if (loads.length === 0) {
    return (
      <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
        <h2 className="text-xl font-semibold text-neutral-darker mb-4">Load Status</h2>
        <div className="text-center py-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-light-muted flex items-center justify-center">
              <Zap size={32} className="text-neutral-muted" />
            </div>
          </div>
          <div className="text-neutral-muted mb-4 text-sm">No loads configured yet.</div>
          <a
            href="/loads"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-neutral-dark text-light-base rounded hover:bg-neutral-muted transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            <span>Add your first load</span>
          </a>
        </div>
      </div>
    );
  }

  if (!realtimeData?.data) {
    return (
      <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
        <h2 className="text-xl font-semibold text-neutral-darker mb-4">Load Status</h2>
        <div className="bg-light-muted border-l-4 border-light-border p-4 rounded mb-4">
          <div className="flex items-center space-x-2 text-neutral-darker">
            <div className="w-2 h-2 bg-light-muted rounded-full"></div>
            <span className="font-medium text-sm">Waiting for sensor data...</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loads.map((load) => (
            <div
              key={load.id}
              className="border border-light-border rounded p-4 bg-light-muted"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-base font-semibold text-neutral-darker">{load.name}</h4>
                <span className="px-2 py-0.5 bg-light-border text-neutral-muted text-xs rounded">
                  UNKNOWN
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-muted">Type:</span>
                  <span className="font-medium text-neutral-dark capitalize">{load.load_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-muted">Expected:</span>
                  <span className="font-medium text-neutral-dark">
                    {load.expected_power_watts.toFixed(1)}W
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const runningLoads = loads.filter(load => isLoadRunning(load));
  const idleLoads = loads.filter(load => !isLoadRunning(load));

  return (
    <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-neutral-darker mb-1">Load Status</h2>
          <p className="text-xs text-neutral-muted">Real-time monitoring of all configured loads</p>
        </div>
        <div className="flex items-center space-x-4 text-xs bg-light-muted px-4 py-2 rounded">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="font-medium text-neutral-dark">Running ({runningLoads.length})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-light-border rounded-full"></div>
            <span className="font-medium text-neutral-dark">Idle ({idleLoads.length})</span>
          </div>
        </div>
      </div>

      {/* Running Loads */}
      {runningLoads.length > 0 && (
        <div className="mb-6">
          <h3 className="text-base font-semibold text-neutral-darker mb-3 flex items-center">
            <span className="w-2 h-2 bg-success rounded-full mr-2"></span>
            Active Loads
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {runningLoads.map((load) => {
              const currentPower = getCurrentPower(load);
              return (
                <div
                  key={load.id}
                  className="border-2 border-light-border rounded p-5 bg-light-muted shadow-card hover:shadow-card-hover transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-semibold text-neutral-darker">{load.name}</h4>
                    <span className="px-2 py-0.5 bg-neutral-muted text-light-base text-xs rounded">
                      RUNNING
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-muted">Type:</span>
                      <span className="font-medium text-neutral-dark capitalize">{load.load_type}</span>
                    </div>
                    {currentPower !== null && (
                      <div className="flex justify-between">
                        <span className="text-neutral-muted">Current Power:</span>
                        <span className="font-semibold text-neutral-darker">
                          {formatPower(currentPower)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-neutral-muted">Expected:</span>
                      <span className="font-medium text-neutral-dark">
                        {load.expected_power_watts.toFixed(1)}W
                      </span>
                    </div>
                    {currentPrediction && currentPrediction.load_id === load.id && (
                      <div className="mt-2 pt-2 border-t border-light-border">
                        <div className="text-xs text-neutral-muted">
                          Confidence: {(currentPrediction.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Loads Display */}
      <div>
        <h3 className="text-base font-semibold text-neutral-darker mb-3">
          {runningLoads.length > 0 ? 'All Loads' : 'Configured Loads'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loads.map((load) => {
            const isRunning = isLoadRunning(load);
            const currentPower = getCurrentPower(load);
            
            return (
              <div
                key={load.id}
                className={`border rounded p-5 transition-shadow hover:shadow-card-hover ${
                  isRunning
                    ? 'border-light-border bg-light-muted shadow-card'
                    : 'border-light-border bg-light-muted hover:border-neutral-muted'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-base font-semibold text-neutral-darker">{load.name}</h4>
                  <span
                    className={`px-2 py-0.5 text-xs rounded ${
                      isRunning
                        ? 'bg-neutral-muted text-light-base'
                        : 'bg-light-border text-neutral-muted'
                    }`}
                  >
                    {isRunning ? 'RUNNING' : 'IDLE'}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-muted">Type:</span>
                    <span className="font-medium text-neutral-dark capitalize">{load.load_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-muted">Expected Power:</span>
                    <span className="font-medium text-neutral-dark">
                      {load.expected_power_watts.toFixed(1)}W
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-muted">Expected Current:</span>
                    <span className="font-medium text-neutral-dark">
                      {formatCurrent(load.expected_current_amps)}
                    </span>
                  </div>
                  {load.min_power_watts && load.max_power_watts && (
                    <div className="text-xs text-neutral-muted mt-2 pt-2 border-t border-light-border">
                      Range: {load.min_power_watts.toFixed(1)}W - {load.max_power_watts.toFixed(1)}W
                    </div>
                  )}
                  {currentPower !== null && (
                    <div className="mt-2 pt-2 border-t border-light-border">
                      <div className="flex justify-between">
                        <span className="text-neutral-muted">Current:</span>
                        <span className="font-semibold text-neutral-darker">
                          {formatPower(currentPower)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-light-border grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-xl font-semibold text-neutral-darker">{loads.length}</div>
          <div className="text-xs text-neutral-muted">Total Loads</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-semibold text-neutral-darker">{runningLoads.length}</div>
          <div className="text-xs text-neutral-muted">Running</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-semibold text-neutral-muted">{idleLoads.length}</div>
          <div className="text-xs text-neutral-muted">Idle</div>
        </div>
      </div>
    </div>
  );
}

