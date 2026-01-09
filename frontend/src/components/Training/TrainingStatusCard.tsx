import { TrainingStatus } from '../../services/api';

interface TrainingStatusCardProps {
  status: TrainingStatus;
}

export const TrainingStatusCard = ({ status }: TrainingStatusCardProps) => {
  const getStatusColor = () => {
    switch (status.status) {
      case 'completed':
        return 'bg-light-muted text-neutral-darker border-light-border';
      case 'running':
        return 'bg-light-muted text-neutral-darker border-light-border';
      case 'failed':
        return 'bg-light-muted text-neutral-darker border-light-border';
      default:
        return 'bg-light-muted text-light-surface border-light-border';
    }
  };

  return (
    <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
      <h3 className="text-base font-semibold text-neutral-darker mb-4">Training Status</h3>
      <div className="space-y-4">
        <div>
          <span className={`px-3 py-1 rounded text-xs font-medium border ${getStatusColor()}`}>
            {status.status.toUpperCase()}
          </span>
        </div>
        
        {status.status === 'running' && (
          <div>
            <div className="w-full bg-light-border rounded-full h-2 mb-2">
              <div
                className="bg-neutral-muted h-2 rounded-full transition-all"
                style={{ width: `${status.progress_percent}%` }}
              />
            </div>
            <div className="text-xs text-neutral-muted">{status.progress_percent.toFixed(1)}% complete</div>
          </div>
        )}

        {status.accuracy !== undefined && (
          <div>
            <div className="text-xl font-semibold text-neutral-darker">
              {(status.accuracy * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-neutral-muted">Model Accuracy</div>
          </div>
        )}

        {status.samples_used > 0 && (
          <div>
            <div className="text-base font-medium text-neutral-darker">{status.samples_used}</div>
            <div className="text-xs text-neutral-muted">Samples Used</div>
          </div>
        )}

        {status.error_message && (
          <div className="bg-light-muted border border-light-border p-3 rounded text-xs text-neutral-darker">
            {status.error_message}
          </div>
        )}

        {status.started_at && (
          <div className="text-xs text-neutral-muted">
            Started: {new Date(status.started_at).toLocaleString()}
          </div>
        )}

        {status.completed_at && (
          <div className="text-xs text-neutral-muted">
            Completed: {new Date(status.completed_at).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};

