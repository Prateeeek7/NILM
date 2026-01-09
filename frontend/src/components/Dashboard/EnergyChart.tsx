import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { dataApi, trainingApi } from '../../services/api';
import { format } from 'date-fns';
import { Loading } from '../common/Loading';

interface EnergyChartProps {
  hours?: number;
  deviceId?: string;
}

export function EnergyChart({ hours = 24, deviceId }: EnergyChartProps) {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

  // Fetch training data immediately (since we know we have it)
  const { data: trainingData, isLoading: isLoadingTraining, error: trainingError } = useQuery({
    queryKey: ['training-data-chart'],
    queryFn: async () => {
      try {
        // Get samples from all load types - get more samples for better visualization
        const [fanData, bulbData, fanBulbData] = await Promise.all([
          trainingApi.getDataFromJson('fan', 90).catch(() => []),
          trainingApi.getDataFromJson('bulb', 90).catch(() => []),
          trainingApi.getDataFromJson('fan+bulb', 90).catch(() => []),
        ]);
        return [...fanData, ...bulbData, ...fanBulbData];
      } catch (error) {
        console.error('Error fetching training data:', error);
        return [];
      }
    },
    staleTime: 300000, // Cache for 5 minutes
    retry: 2, // Retry twice on failure
  });

  // Try to fetch historical data (but don't block on it)
  const { data: historicalData, isLoading: isLoadingHistorical } = useQuery({
    queryKey: ['historical', startTime.toISOString(), endTime.toISOString(), deviceId],
    queryFn: () =>
      dataApi.getHistorical(
        startTime.toISOString(),
        endTime.toISOString(),
        deviceId,
        1000
      ),
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 1, // Only retry once
    staleTime: 60000, // Consider data stale after 1 minute
    enabled: false, // Disable by default - we'll use training data
  });

  // Process training data (primary source)
  let chartData: any[] = [];
  if (trainingData && trainingData.length > 0) {
    // Process training data: extract data points from windows and create time series
    const allPoints: any[] = [];
    let recordIndex = 0;
    
    trainingData.forEach((record: any) => {
      if (record.data_window && record.data_window.length > 0) {
        // Each record represents a 2-minute window, sampled every 2 minutes
        const baseTimestamp = Date.now() - (trainingData.length - recordIndex) * 120000; // 2 minutes per record
        
        record.data_window.forEach((point: any, windowIndex: number) => {
          // Each point in the window is ~100ms apart (10Hz sampling)
          const pointTimestamp = baseTimestamp + windowIndex * 100;
          allPoints.push({
            timestamp: point.timestamp || pointTimestamp,
            current: point.current,
            power: point.power,
            voltage: point.voltage,
            label: record.label,
          });
        });
        recordIndex++;
      }
    });

    // Sort by timestamp
    allPoints.sort((a, b) => a.timestamp - b.timestamp);

    // Sample every 5th point to keep chart readable but show good detail
    const sampledPoints = allPoints.filter((_, index) => index % 5 === 0);

    // Create time labels - show time progression over 3 hours
    const startTimestamp = sampledPoints[0]?.timestamp || Date.now();
    chartData = sampledPoints.map((point) => {
      const timeOffset = (point.timestamp - startTimestamp) / 1000 / 60; // minutes from start
      const hours = Math.floor(timeOffset / 60);
      const minutes = Math.floor(timeOffset % 60);
      return {
        time: `${hours}:${String(minutes).padStart(2, '0')}`,
        current: point.current,
        power: point.power,
        voltage: point.voltage,
      };
    });
  } else if (historicalData?.data && historicalData.data.length > 0) {
    // Fallback to historical data if available
    chartData = historicalData.data.map((point: any) => ({
      time: format(new Date(point.timestamp), 'HH:mm'),
      current: point.current,
      power: point.power,
      voltage: point.voltage,
    }));
  }

  const isLoading = isLoadingTraining;

  if (isLoading) {
    return (
      <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
        <h2 className="text-lg font-semibold text-neutral-darker mb-4">
          Energy Consumption ({hours}h)
        </h2>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-muted border-t-transparent mx-auto mb-4"></div>
            <p className="text-sm text-neutral-muted">Loading energy data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (trainingError) {
    return (
      <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
        <h2 className="text-lg font-semibold text-neutral-darker mb-4">
          Energy Consumption ({hours}h)
        </h2>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-sm text-neutral-darker mb-2">Error loading data</p>
            <p className="text-xs text-neutral-muted">
              {trainingError instanceof Error ? trainingError.message : 'Failed to load training data'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
        <h2 className="text-lg font-semibold text-neutral-darker mb-4">
          Energy Consumption ({hours}h)
        </h2>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-sm text-neutral-muted mb-2">No data available</p>
            <p className="text-xs text-neutral-muted">
              Data will appear here once sensor readings are collected.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isTrainingData = !historicalData?.data || historicalData.data.length === 0;

  return (
    <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-darker">
          Energy Consumption ({hours}h)
        </h2>
        {isTrainingData && (
          <span className="text-xs px-2 py-1 bg-light-muted text-neutral-darker rounded">
            Training Data
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="time" 
            stroke="#64748b"
            tick={{ fill: '#64748b', fontSize: 10 }}
            style={{ fontSize: '10px' }}
          />
          <YAxis 
            yAxisId="left" 
            stroke="#3b82f6"
            tick={{ fill: '#64748b', fontSize: 10 }}
            label={{ value: 'Current (A)', angle: -90, position: 'insideLeft', style: { fill: '#3b82f6', fontSize: '10px' } }}
            style={{ fontSize: '10px' }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right"
            stroke="#22c55e"
            tick={{ fill: '#64748b', fontSize: 10 }}
            label={{ value: 'Power (W)', angle: 90, position: 'insideRight', style: { fill: '#22c55e', fontSize: '10px' } }}
            style={{ fontSize: '10px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#ffffff', 
              borderColor: '#e2e8f0', 
              borderRadius: '4px',
              color: '#1e293b',
              fontSize: '11px',
              padding: '6px'
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '11px' }}
            iconSize={10}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="current"
            stroke="#3b82f6"
            name="Current (A)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="power"
            stroke="#22c55e"
            name="Power (W)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
      {isTrainingData && (
        <div className="mt-4 pt-4 border-t border-light-border text-xs text-neutral-muted">
          <p>Displaying data from training dataset (3 hours of recorded data)</p>
        </div>
      )}
    </div>
  );
}

