import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../services/api';
import { formatCost, formatEnergy } from '../../utils/formatters';
import { Currency, Edit2, Save, X } from 'lucide-react';
import { Loading } from '../common/Loading';

export function CostEstimationCard() {
  const [ratePerKwh, setRatePerKwh] = useState<number>(8.0); // Default: ₹8/kWh (typical Indian rate)
  const [isEditing, setIsEditing] = useState(false);
  const [tempRate, setTempRate] = useState<string>('8.00');

  // Load saved rate from localStorage
  useEffect(() => {
    const savedRate = localStorage.getItem('electricity_rate_per_kwh');
    if (savedRate) {
      const rate = parseFloat(savedRate);
      if (!isNaN(rate) && rate > 0) {
        setRatePerKwh(rate);
        setTempRate(rate.toFixed(2));
      }
    }
  }, []);

  // Use training data stats instead of historical cost estimation
  const { data: trainingStats, isLoading } = useQuery({
    queryKey: ['training-data-stats-cost', ratePerKwh],
    queryFn: () => analyticsApi.getTrainingDataStats(ratePerKwh),
    refetchInterval: 60000, // Refetch every minute
    staleTime: 300000, // Cache for 5 minutes
  });

  const handleSave = () => {
    const rate = parseFloat(tempRate);
    if (isNaN(rate) || rate <= 0) {
      alert('Please enter a valid rate (must be greater than 0)');
      return;
    }
    setRatePerKwh(rate);
    localStorage.setItem('electricity_rate_per_kwh', rate.toString());
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempRate(ratePerKwh.toString());
    setIsEditing(false);
  };

  return (
    <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Currency size={20} className="text-neutral-darker" />
          <h3 className="text-base font-semibold text-neutral-darker">Cost Estimation (₹)</h3>
        </div>
      </div>

      {/* Rate Input */}
      <div className="mb-4 p-3 bg-light-base border border-light-border rounded">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-neutral-darker">Electricity Rate:</label>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-1 px-2 py-1 text-xs text-neutral-darker hover:bg-light-muted rounded transition-colors"
            >
              <Edit2 size={12} />
              <span>Edit</span>
            </button>
          ) : (
            <div className="flex items-center space-x-1">
              <button
                onClick={handleSave}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-light-muted text-neutral-darker rounded hover:bg-light-border transition-colors"
              >
                <Save size={12} />
                <span>Save</span>
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-light-muted text-neutral-darker rounded hover:bg-light-border transition-colors"
              >
                <X size={12} />
                <span>Cancel</span>
              </button>
            </div>
          )}
        </div>
        {!isEditing ? (
          <div className="text-lg font-semibold text-neutral-darker">
            ₹{ratePerKwh.toFixed(2)} / kWh
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-neutral-muted">₹</span>
            <input
              type="number"
              value={tempRate}
              onChange={(e) => setTempRate(e.target.value)}
              step="0.01"
              min="0.01"
              className="flex-1 px-2 py-1 border border-light-border rounded bg-light-surface text-neutral-darker text-sm focus:outline-none focus:ring-2 focus:ring-neutral-darker"
              placeholder="8.00"
              autoFocus
            />
            <span className="text-sm text-neutral-muted">/ kWh</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <Loading />
      ) : trainingStats ? (
        <div className="space-y-4">
          <div className="bg-light-muted rounded border border-light-border p-4">
            <div className="text-xs text-neutral-muted mb-1">Total Energy (Training Data)</div>
            <div className="text-xl font-semibold text-neutral-darker">
              {formatEnergy(trainingStats.total_energy_kwh || 0)}
            </div>
            <div className="text-xs text-neutral-muted mt-1">
              Based on {trainingStats.total_samples || 0} samples
            </div>
          </div>
          <div className="bg-light-muted rounded border border-light-border p-4">
            <div className="text-xs text-neutral-muted mb-1">Total Cost</div>
            <div className="text-xl font-semibold text-neutral-darker">
              {formatCost(trainingStats.total_cost_inr || 0)}
            </div>
            <div className="text-xs text-neutral-muted mt-1">
              At ₹{ratePerKwh.toFixed(2)}/kWh
            </div>
          </div>

          {trainingStats.load_breakdown && trainingStats.load_breakdown.length > 0 && (
            <div className="mt-4 pt-4 border-t border-light-border">
              <div className="text-xs font-medium text-neutral-darker mb-2">Breakdown by Load:</div>
              <div className="space-y-2">
                {trainingStats.load_breakdown.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-light-base rounded border border-light-border"
                  >
                    <div className="flex-1">
                      <div className="text-xs font-medium text-neutral-darker capitalize">{item.load_type}</div>
                      <div className="text-xs text-neutral-muted">
                        {formatEnergy(item.energy_kwh)} ({item.percentage?.toFixed(1) || 0}%)
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-neutral-darker">
                      {formatCost(item.cost_inr || 0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-light-border">
            <div className="text-xs text-neutral-muted text-center">
              <p>Data from training dataset (3 hours)</p>
              <p className="mt-1">Avg Power: {trainingStats.total_power_watts?.toFixed(2) || 0} W</p>
              <p>Avg Current: {trainingStats.total_current_amps?.toFixed(3) || 0} A</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-neutral-muted">
          No cost estimation data available
        </div>
      )}
    </div>
  );
}
