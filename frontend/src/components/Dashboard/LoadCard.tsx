import { LoadPrediction } from '../../types';
import { formatConfidence } from '../../utils/formatters';

interface LoadCardProps {
  prediction: LoadPrediction;
}

export function LoadCard({ prediction }: LoadCardProps) {
  const confidenceColor = prediction.confidence > 0.8 
    ? 'bg-success text-light-base' 
    : prediction.confidence > 0.5 
    ? 'bg-warning text-neutral-darker' 
    : 'bg-error text-light-base';

  return (
    <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-darker capitalize">
          {prediction.load_type}
        </h3>
        <div className={`px-3 py-1 rounded text-xs font-medium ${confidenceColor}`}>
          {formatConfidence(prediction.confidence)}
        </div>
      </div>
      <div className="text-xs text-neutral-muted">
        <p>Detected at: {new Date(prediction.timestamp).toLocaleString()}</p>
        {prediction.load_id && (
          <p className="mt-1">Load ID: {prediction.load_id}</p>
        )}
      </div>
    </div>
  );
}

