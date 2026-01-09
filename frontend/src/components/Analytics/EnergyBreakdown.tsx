import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LabelList } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../services/api';
import { format, subDays } from 'date-fns';
import { Loading } from '../common/Loading';
import { formatEnergy, formatCost } from '../../utils/formatters';

export function EnergyBreakdown() {
  const endTime = new Date();
  const startTime = subDays(endTime, 7); // Last 7 days

  // Use training data stats as primary source
  const { data: trainingStats, isLoading: isLoadingTraining } = useQuery({
    queryKey: ['training-data-stats-breakdown'],
    queryFn: () => analyticsApi.getTrainingDataStats(8.0),
    refetchInterval: 60000,
    staleTime: 300000,
  });

  // Try to get historical data (but don't block on it)
  const { data: historicalData, isLoading: isLoadingHistorical } = useQuery({
    queryKey: ['energy-breakdown', startTime.toISOString(), endTime.toISOString()],
    queryFn: () =>
      analyticsApi.getEnergyBreakdown(
        startTime.toISOString(),
        endTime.toISOString()
      ),
    refetchInterval: 60000,
    enabled: false, // Disabled - use training data
  });

  const isLoading = isLoadingTraining;
  const data = historicalData || (trainingStats ? {
    total_energy_kwh: trainingStats.total_energy_kwh,
    total_cost_usd: trainingStats.total_cost_inr,
    breakdown: trainingStats.load_breakdown?.map((item: any) => ({
      load_type: item.load_type,
      energy_kwh: item.energy_kwh,
      percentage: item.percentage,
      cost_usd: item.cost_inr,
    })) || []
  } : null);

  const chartData =
    data?.breakdown?.map((item) => ({
      name: item.load_type,
      value: item.energy_kwh,
      percentage: item.percentage,
      cost: item.cost_usd,
    })) || [];

  const chartColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

  const isTrainingData = !historicalData;

  if (isLoading) {
    return (
      <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
        <Loading />
      </div>
    );
  }

  return (
    <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-darker">Energy Breakdown</h2>
        {isTrainingData && (
          <span className="text-xs px-2 py-1 bg-light-muted text-neutral-darker rounded">
            Training Data
          </span>
        )}
      </div>
      {data && (
        <div className="mb-4 space-y-2">
          <div className="text-sm text-neutral-dark">
            Total Energy: <span className="font-semibold text-neutral-darker">{formatEnergy(data.total_energy_kwh)}</span>
          </div>
          {data.total_cost_usd && (
            <div className="text-sm text-neutral-dark">
              Total Cost: <span className="font-semibold text-neutral-darker">{formatCost(data.total_cost_usd)}</span>
            </div>
          )}
        </div>
      )}
      {chartData.length === 0 ? (
        <div className="text-center py-12 text-sm text-neutral-muted">
          No energy data available for the selected period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
              outerRadius={140}
              fill="#3b82f6"
              dataKey="value"
              style={{ fontSize: '9px' }}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                fontSize: '12px',
                padding: '8px'
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '11px' }}
              iconSize={12}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

