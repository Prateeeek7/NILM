import { LiveMonitoring } from './LiveMonitoring';
import { EnergyChart } from './EnergyChart';
import { LoadStatusPanel } from './LoadStatusPanel';
import { DeviceStatusCard } from './DeviceStatusCard';
import { KPICard } from './KPICard';
import { CostEstimationCard } from './CostEstimationCard';
import { TrainingDataStats } from '../Analytics/TrainingDataStats';
import { useRealtimeData } from '../../hooks/useRealtimeData';
import { formatCurrent, formatVoltage, formatPower } from '../../utils/formatters';
import { useQuery } from '@tanstack/react-query';
import { loadsApi, analyticsApi } from '../../services/api';
import { Zap, Battery, Activity, RefreshCw } from 'lucide-react';

export function Dashboard() {
  const { data: realtimeData, isConnected } = useRealtimeData();
  const { data: loads } = useQuery({
    queryKey: ['loads'],
    queryFn: () => loadsApi.getAll(true),
  });

  // Fetch training data stats as fallback
  const { data: trainingStats } = useQuery({
    queryKey: ['training-data-stats-dashboard'],
    queryFn: () => analyticsApi.getTrainingDataStats(8.0),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const sensorData = realtimeData?.data;
  
  // Use real-time data if available, otherwise use training data averages
  const displayPower = sensorData?.power || (trainingStats?.total_power_watts ?? 0);
  const displayCurrent = sensorData?.current || (trainingStats?.total_current_amps ?? 0);
  const displayVoltage = sensorData?.voltage || (trainingStats?.total_voltage ?? 12.0);
  
  // Check if we're using training data (no real-time connection)
  const usingTrainingData = !sensorData || !isConnected;

  const runningLoads = loads?.filter(load => {
    if (!sensorData || sensorData.power < 0.1) return false;
    return load.min_power_watts && load.max_power_watts &&
           load.min_power_watts <= sensorData.power && 
           sensorData.power <= load.max_power_watts;
  }) || [];
  
  // Only count active loads when we have real-time sensor data
  const activeLoadsCount = runningLoads.length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-darker mb-1">Dashboard</h1>
        <p className="text-sm text-neutral-muted">Real-time Load Monitoring & Energy Analytics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Power"
          value={displayPower.toFixed(2)}
          unit="W"
          icon={<Zap size={20} />}
          color="info"
        />
        <KPICard
          title="Voltage"
          value={displayVoltage.toFixed(2)}
          unit="V"
          icon={<Battery size={20} />}
          color="success"
        />
        <KPICard
          title="Current"
          value={displayCurrent.toFixed(3)}
          unit="A"
          icon={<Activity size={20} />}
          color="info"
        />
        <KPICard
          title="Active Loads"
          value={activeLoadsCount}
          unit={`of ${loads?.length || 0}`}
          icon={<RefreshCw size={20} />}
          color={activeLoadsCount > 0 ? 'success' : 'warning'}
        />
      </div>

      {/* Connection Status Banner */}
      {!isConnected && (
        <div className="mb-6 bg-light-muted border-l-4 border-light-border p-4 rounded">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-neutral-muted rounded-full"></div>
            <div>
              <p className="font-semibold text-neutral-darker">Using Training Data</p>
              <p className="text-sm text-neutral-darker">
                No real-time connection. Displaying statistics from training dataset (3 hours of recorded data).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <LoadStatusPanel />
          <EnergyChart hours={24} />
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          <DeviceStatusCard />
          <CostEstimationCard />
        </div>
      </div>

      {/* Live Monitoring - Full Width */}
      <div className="mt-8">
        <LiveMonitoring />
      </div>

      {/* Training Data Statistics - Full Width */}
      <div className="mt-8">
        <TrainingDataStats />
      </div>
    </div>
  );
}

