import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../services/api';
import { format, subDays } from 'date-fns';
import { Loading } from '../common/Loading';
import { formatEnergy } from '../../utils/formatters';

export function HistoricalChart() {
  const endTime = new Date();
  const startTime = subDays(endTime, 30); // Last 30 days

  // Use training data stats as primary source
  const { data: trainingStats, isLoading: isLoadingTraining } = useQuery({
    queryKey: ['training-data-stats-historical'],
    queryFn: () => analyticsApi.getTrainingDataStats(8.0),
    refetchInterval: 300000,
    staleTime: 300000,
  });

  // Try to get historical data (but don't block on it)
  const { data: historicalData } = useQuery({
    queryKey: ['historical-energy', startTime.toISOString(), endTime.toISOString()],
    queryFn: () =>
      analyticsApi.getEnergyBreakdown(
        startTime.toISOString(),
        endTime.toISOString()
      ),
    refetchInterval: 300000,
    enabled: false, // Disabled - use training data
  });

  const isLoading = isLoadingTraining;
  const data = historicalData || (trainingStats ? {
    breakdown: trainingStats.load_breakdown?.map((item: any) => ({
      load_type: item.load_type,
      energy_kwh: item.energy_kwh,
      percentage: item.percentage,
    })) || []
  } : null);

  const chartData =
    data?.breakdown?.map((item) => ({
      load: item.load_type,
      energy: item.energy_kwh,
      percentage: item.percentage,
    })) || [];

  const isTrainingData = !historicalData;

  return (
    <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-darker">Historical Energy</h2>
        {isTrainingData && (
          <span className="text-xs px-2 py-1 bg-light-muted text-neutral-darker rounded">
            Training Data
          </span>
        )}
      </div>
      {isLoading ? (
        <Loading />
      ) : chartData.length === 0 ? (
        <div className="text-center py-12 text-sm text-neutral-muted">
          No historical data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="load" 
              tick={{ fontSize: 11 }}
              style={{ fontSize: '11px' }}
            />
            <YAxis 
              tick={{ fontSize: 11 }}
              style={{ fontSize: '11px' }}
            />
            <Tooltip 
              formatter={(value: number) => formatEnergy(value)}
              contentStyle={{ 
                fontSize: '12px',
                padding: '8px'
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '11px' }}
              iconSize={12}
            />
            <Bar dataKey="energy" fill="#3b82f6" name="Energy (kWh)" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

