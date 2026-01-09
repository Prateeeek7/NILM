import { useRealtimeData } from '../../hooks/useRealtimeData';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../services/api';
import { formatCurrent, formatVoltage, formatPower } from '../../utils/formatters';
import { LoadCard } from './LoadCard';
import { Zap, Battery, Activity } from 'lucide-react';

export function LiveMonitoring() {
  const { data, isConnected } = useRealtimeData();
  
  // Fetch training data stats as fallback
  const { data: trainingStats } = useQuery({
    queryKey: ['training-data-stats-live'],
    queryFn: () => analyticsApi.getTrainingDataStats(8.0),
    refetchInterval: 30000,
  });

  // Use real-time data if available, otherwise use training data
  const sensorData = data?.data;
  const prediction = data?.prediction;
  
  // Fallback to training data if no real-time data
  const displayData = sensorData || {
    current: trainingStats?.total_current_amps || 0,
    voltage: trainingStats?.total_voltage || 12.0,
    power: trainingStats?.total_power_watts || 0,
    device_id: 'TRAINING_DATA',
    timestamp: Date.now(),
  };
  
  const usingTrainingData = !sensorData || !isConnected;

  return (
    <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-neutral-darker">Live Sensor Data</h2>
        <div className="flex items-center space-x-3">
          {usingTrainingData && (
            <span className="text-xs px-2 py-1 bg-light-muted text-neutral-darker rounded">
              Training Data
            </span>
          )}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-neutral-muted' : 'bg-light-muted'}`}></div>
            <span className="text-xs text-neutral-muted">{isConnected ? 'Live' : 'Training Data'}</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-light-muted rounded p-4 border border-light-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-neutral-muted uppercase tracking-wide mb-1">Current</div>
              <div className="text-xl font-semibold text-neutral-darker">
                {formatCurrent(displayData.current)}
              </div>
            </div>
            <Zap size={20} className="text-neutral-darker" />
          </div>
        </div>
        <div className="bg-light-muted rounded p-4 border border-light-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-neutral-muted uppercase tracking-wide mb-1">Voltage</div>
              <div className="text-xl font-semibold text-neutral-darker">
                {formatVoltage(displayData.voltage)}
              </div>
            </div>
            <Battery size={20} className="text-neutral-darker" />
          </div>
        </div>
        <div className="bg-light-muted rounded p-4 border border-light-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-neutral-muted uppercase tracking-wide mb-1">Power</div>
              <div className="text-xl font-semibold text-neutral-darker">
                {formatPower(displayData.power)}
              </div>
            </div>
            <Activity size={20} className="text-neutral-darker" />
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-light-border">
        <div className="flex items-center justify-between text-xs text-neutral-muted">
          <span>
            Device: <span className="font-medium text-neutral-dark">{displayData.device_id}</span>
          </span>
          <span>{new Date(displayData.timestamp).toLocaleTimeString()}</span>
        </div>
        {usingTrainingData && (
          <div className="mt-2 text-xs text-neutral-muted">
            Showing average values from training dataset ({trainingStats?.total_samples || 0} samples)
          </div>
        )}
      </div>

      {/* Load Prediction */}
      {prediction && (
        <div className="mt-6 pt-6 border-t border-light-border">
          <h3 className="text-base font-semibold text-neutral-darker mb-4">Detected Load</h3>
          <LoadCard prediction={prediction} />
        </div>
      )}
    </div>
  );
}

