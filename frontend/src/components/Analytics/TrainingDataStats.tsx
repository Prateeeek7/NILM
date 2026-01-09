import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../services/api';
import { formatCost, formatPower, formatCurrent, formatEnergy } from '../../utils/formatters';
import { TrendingUp, Zap, Activity, DollarSign, Clock, BarChart3 } from 'lucide-react';
import { useState } from 'react';

interface LoadBreakdown {
  load_type: string;
  samples_count: number;
  energy_kwh: number;
  cost_inr: number;
  avg_power_watts: number;
  avg_current_amps: number;
  total_time_hours: number;
  percentage: number;
}

interface TrainingDataStatsResponse {
  total_samples: number;
  load_breakdown: LoadBreakdown[];
  total_energy_kwh: number;
  total_cost_inr: number;
  total_power_watts: number;
  total_current_amps: number;
  rate_per_kwh: number;
  message?: string;
}

export function TrainingDataStats() {
  const [ratePerKwh, setRatePerKwh] = useState(8.0);

  const { data: stats, isLoading, error } = useQuery<TrainingDataStatsResponse>({
    queryKey: ['training-data-stats', ratePerKwh],
    queryFn: () => analyticsApi.getTrainingDataStats(ratePerKwh),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="bg-light-base border border-light-border rounded-lg shadow-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-light-muted rounded w-1/3"></div>
          <div className="h-4 bg-light-muted rounded w-1/2"></div>
          <div className="h-32 bg-light-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-light-base border border-light-border rounded-lg shadow-card p-6">
        <div className="text-error text-sm">
          Error loading training data statistics: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    );
  }

  if (!stats || stats.message) {
    return (
      <div className="bg-light-base border border-light-border rounded-lg shadow-card p-6">
        <h3 className="text-lg font-semibold text-neutral-darker mb-4">Training Data Statistics</h3>
        <p className="text-neutral-muted">{stats?.message || 'No training data available'}</p>
      </div>
    );
  }

  const getLoadTypeColor = (loadType: string) => {
    const colors: Record<string, string> = {
      'fan': 'bg-info',
      'bulb': 'bg-warning',
      'fan+bulb': 'bg-success',
      'fan+bulb+': 'bg-success',
    };
    return colors[loadType.toLowerCase()] || 'bg-neutral';
  };

  return (
    <div className="bg-light-base border border-light-border rounded-lg shadow-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-neutral-darker mb-1">Training Data Statistics</h3>
          <p className="text-sm text-neutral-muted">Energy consumption and cost breakdown from training data</p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-neutral-muted">Rate (₹/kWh):</label>
          <input
            type="number"
            value={ratePerKwh}
            onChange={(e) => setRatePerKwh(parseFloat(e.target.value) || 0)}
            className="w-20 px-2 py-1 border border-light-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-info"
            min="0"
            step="0.1"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-light-surface border border-light-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Zap size={16} className="text-info" />
            <span className="text-xs text-neutral-muted">Total Energy</span>
          </div>
          <p className="text-xl font-semibold text-neutral-darker">{formatEnergy(stats.total_energy_kwh)}</p>
        </div>
        <div className="bg-light-surface border border-light-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign size={16} className="text-success" />
            <span className="text-xs text-neutral-muted">Total Cost</span>
          </div>
          <p className="text-xl font-semibold text-neutral-darker">{formatCost(stats.total_cost_inr)}</p>
        </div>
        <div className="bg-light-surface border border-light-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Activity size={16} className="text-warning" />
            <span className="text-xs text-neutral-muted">Avg Power</span>
          </div>
          <p className="text-xl font-semibold text-neutral-darker">{formatPower(stats.total_power_watts)}</p>
        </div>
        <div className="bg-light-surface border border-light-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 size={16} className="text-info" />
            <span className="text-xs text-neutral-muted">Samples</span>
          </div>
          <p className="text-xl font-semibold text-neutral-darker">{stats.total_samples.toLocaleString()}</p>
        </div>
      </div>

      {/* Load Breakdown Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-light-border">
              <th className="text-left py-3 px-4 text-sm font-semibold text-neutral-darker">Load Type</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-neutral-darker">Samples</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-neutral-darker">Time (hrs)</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-neutral-darker">Avg Power</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-neutral-darker">Avg Current</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-neutral-darker">Energy</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-neutral-darker">Cost</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-neutral-darker">%</th>
            </tr>
          </thead>
          <tbody>
            {stats.load_breakdown.map((load, index) => (
              <tr key={index} className="border-b border-light-border hover:bg-light-surface transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getLoadTypeColor(load.load_type)}`}></div>
                    <span className="text-sm font-medium text-neutral-darker capitalize">{load.load_type}</span>
                  </div>
                </td>
                <td className="text-right py-3 px-4 text-sm text-neutral-muted">{load.samples_count.toLocaleString()}</td>
                <td className="text-right py-3 px-4 text-sm text-neutral-muted">{load.total_time_hours.toFixed(2)}</td>
                <td className="text-right py-3 px-4 text-sm text-neutral-darker">{formatPower(load.avg_power_watts)}</td>
                <td className="text-right py-3 px-4 text-sm text-neutral-darker">{formatCurrent(load.avg_current_amps)}</td>
                <td className="text-right py-3 px-4 text-sm font-medium text-neutral-darker">{formatEnergy(load.energy_kwh)}</td>
                <td className="text-right py-3 px-4 text-sm font-semibold text-success">{formatCost(load.cost_inr)}</td>
                <td className="text-right py-3 px-4">
                  <div className="flex items-center justify-end space-x-2">
                    <div className="w-16 bg-light-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getLoadTypeColor(load.load_type)}`}
                        style={{ width: `${load.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-neutral-muted w-12 text-right">{load.percentage.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-light-surface font-semibold">
              <td className="py-3 px-4 text-sm text-neutral-darker">Total</td>
              <td className="text-right py-3 px-4 text-sm text-neutral-darker">{stats.total_samples.toLocaleString()}</td>
              <td className="text-right py-3 px-4 text-sm text-neutral-darker">
                {stats.load_breakdown.reduce((sum, l) => sum + l.total_time_hours, 0).toFixed(2)}
              </td>
              <td className="text-right py-3 px-4 text-sm text-neutral-darker">-</td>
              <td className="text-right py-3 px-4 text-sm text-neutral-darker">-</td>
              <td className="text-right py-3 px-4 text-sm text-neutral-darker">{formatEnergy(stats.total_energy_kwh)}</td>
              <td className="text-right py-3 px-4 text-sm text-success">{formatCost(stats.total_cost_inr)}</td>
              <td className="text-right py-3 px-4 text-sm text-neutral-darker">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}




