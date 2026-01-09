import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../services/api';
import { format, subDays } from 'date-fns';
import { Loading } from '../common/Loading';
import { formatCost, formatEnergy } from '../../utils/formatters';

export function CostEstimation() {
  const endTime = new Date();
  const startTime = subDays(endTime, 30); // Last 30 days

  // Use training data stats as primary source
  const { data: trainingStats, isLoading: isLoadingTraining } = useQuery({
    queryKey: ['training-data-stats-cost-analytics'],
    queryFn: () => analyticsApi.getTrainingDataStats(8.0),
    refetchInterval: 300000,
    staleTime: 300000,
  });

  // Try to get historical cost data (but don't block on it)
  const { data: historicalData } = useQuery({
    queryKey: ['cost-estimation', startTime.toISOString(), endTime.toISOString()],
    queryFn: () =>
      analyticsApi.getCostEstimation(
        startTime.toISOString(),
        endTime.toISOString(),
        undefined,
        8.0 // ₹8 per kWh (default Indian rate)
      ),
    refetchInterval: 300000,
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

  const isTrainingData = !historicalData;

  return (
    <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-darker">Cost Estimation</h2>
        {isTrainingData && (
          <span className="text-xs px-2 py-1 bg-light-muted text-neutral-darker rounded">
            Training Data
          </span>
        )}
      </div>
      {isLoading ? (
        <Loading />
      ) : data && (
        <div className="space-y-4">
          <div className="bg-light-muted rounded border border-light-border p-4">
            <div className="text-xs text-neutral-muted mb-1">Total Energy</div>
            <div className="text-2xl font-semibold text-neutral-darker">
              {formatEnergy(data.total_energy_kwh)}
            </div>
          </div>
          <div className="bg-light-muted rounded border border-light-border p-4">
            <div className="text-xs text-neutral-muted mb-1">Total Cost</div>
            <div className="text-2xl font-semibold text-neutral-darker">
              {data.total_cost_usd ? formatCost(data.total_cost_usd) : 'N/A'}
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-base font-semibold text-neutral-darker mb-3">Breakdown by Load</h3>
            <div className="space-y-2">
              {data.breakdown && data.breakdown.length > 0 ? (
                data.breakdown.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-light-muted rounded border border-light-border"
                  >
                    <div>
                      <div className="font-medium text-sm text-neutral-darker capitalize">{item.load_type}</div>
                      <div className="text-xs text-neutral-muted">
                        {formatEnergy(item.energy_kwh)} ({item.percentage.toFixed(1)}%)
                      </div>
                    </div>
                    <div className="text-base font-semibold text-neutral-darker">
                      {item.cost_usd ? formatCost(item.cost_usd) : 'N/A'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-sm text-neutral-muted">
                  No cost data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {!data && (
        <div className="text-center py-12 text-sm text-neutral-muted">
          No cost estimation data available
        </div>
      )}
    </div>
  );
}

