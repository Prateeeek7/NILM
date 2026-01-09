import { TrainingStats } from '../../services/api';

interface TrainingStatsCardProps {
  stats: TrainingStats;
}

export const TrainingStatsCard = ({ stats }: TrainingStatsCardProps) => {
  return (
    <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
      <h3 className="text-base font-semibold text-neutral-darker mb-4">Training Data Statistics</h3>
      <div className="space-y-4">
        <div>
          <div className="text-2xl font-semibold text-neutral-darker">{stats.total_samples}</div>
          <div className="text-xs text-neutral-muted">Total Samples</div>
        </div>
        <div>
          <div className="text-xl font-semibold text-neutral-darker">{stats.unique_labels}</div>
          <div className="text-xs text-neutral-muted">Unique Load Types</div>
        </div>
        <div className="pt-4 border-t border-light-border">
          <div className="text-xs font-medium mb-2 text-neutral-darker">Samples by Label:</div>
          <div className="space-y-1">
            {Object.entries(stats.samples_by_label).map(([label, count]) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-neutral-muted capitalize">{label}:</span>
                <span className="font-medium text-neutral-darker">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

