import { useQuery } from '@tanstack/react-query';
import { modelApi } from '../../services/api';
import { Loading } from '../common/Loading';
import { Brain, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export function ModelInfoCard() {
  const { data: modelInfo, isLoading } = useQuery({
    queryKey: ['model-info'],
    queryFn: () => modelApi.getInfo(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-darker" />
          <span className="text-sm text-neutral-muted">Loading model information...</span>
        </div>
      </div>
    );
  }

  if (!modelInfo) {
    return (
      <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
        <div className="text-neutral-darker">Unable to fetch model information</div>
      </div>
    );
  }

  return (
    <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-darker flex items-center">
          <Brain size={20} className="mr-2 text-neutral-darker" />
          ML Model Information
        </h3>
        <div className={clsx(
          "flex items-center space-x-2 px-3 py-1 rounded",
          modelInfo.loaded
            ? 'bg-light-muted text-neutral-darker'
            : 'bg-light-muted text-neutral-darker'
        )}>
          {modelInfo.loaded ? (
            <CheckCircle size={16} />
          ) : (
            <XCircle size={16} />
          )}
          <span className="text-xs font-medium">
            {modelInfo.loaded ? 'Loaded' : 'Not Loaded'}
          </span>
        </div>
      </div>

      {modelInfo.loaded ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-light-surface rounded p-4 border border-light-border">
              <div className="text-xs text-neutral-muted mb-1">Model Type</div>
              <div className="text-base font-semibold text-neutral-darker">{modelInfo.model_type || 'N/A'}</div>
            </div>
            <div className="bg-light-surface rounded p-4 border border-light-border">
              <div className="text-xs text-neutral-muted mb-1">Version</div>
              <div className="text-base font-semibold text-neutral-darker">{modelInfo.version || 'N/A'}</div>
            </div>
            {modelInfo.n_estimators && (
              <div className="bg-light-surface rounded p-4 border border-light-border">
                <div className="text-xs text-neutral-muted mb-1">Decision Trees</div>
                <div className="text-base font-semibold text-neutral-darker">{modelInfo.n_estimators}</div>
              </div>
            )}
            {modelInfo.feature_count > 0 && (
              <div className="bg-light-surface rounded p-4 border border-light-border">
                <div className="text-xs text-neutral-muted mb-1">Features</div>
                <div className="text-base font-semibold text-neutral-darker">{modelInfo.feature_count}</div>
              </div>
            )}
          </div>

          {modelInfo.accuracy !== null && modelInfo.accuracy !== undefined && (
            <div className="pt-4 border-t border-light-border">
              <div className="text-xs text-neutral-muted mb-3 font-medium uppercase tracking-wide">Performance Metrics</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modelInfo.accuracy !== null && (
                  <div className="bg-light-muted rounded p-4 border border-light-border">
                    <div className="text-xs text-neutral-muted mb-1">Test Accuracy</div>
                    <div className="text-2xl font-semibold text-neutral-darker">
                      {(modelInfo.accuracy * 100).toFixed(2)}%
                    </div>
                  </div>
                )}
                {modelInfo.cv_accuracy !== null && modelInfo.cv_accuracy !== undefined && (
                  <div className="bg-light-muted rounded p-4 border border-light-border">
                    <div className="text-xs text-neutral-muted mb-1">CV Accuracy</div>
                    <div className="text-2xl font-semibold text-neutral-darker">
                      {(modelInfo.cv_accuracy * 100).toFixed(2)}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-light-border">
            {modelInfo.classes && modelInfo.classes.length > 0 && (
              <div>
                <div className="text-xs text-neutral-muted mb-3 font-medium uppercase tracking-wide">Trained Classes</div>
                <div className="flex flex-wrap gap-2">
                  {modelInfo.classes.map((className: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-light-muted text-neutral-darker rounded text-sm font-medium capitalize"
                    >
                      {className}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {modelInfo.feature_count > 0 && modelInfo.feature_names && modelInfo.feature_names.length > 0 && (
              <div>
                <div className="text-xs text-neutral-muted mb-3 font-medium uppercase tracking-wide">
                  Feature Names ({modelInfo.feature_count} total)
                </div>
                <div className="bg-light-surface rounded p-3 border border-light-border">
                  <div className="text-xs text-neutral-muted font-mono leading-relaxed">
                    {modelInfo.feature_names.slice(0, 10).join(', ')}
                    {modelInfo.feature_names.length > 10 && ' ...'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <XCircle size={48} className="text-neutral-muted mx-auto mb-2" />
          <p className="text-sm text-neutral-muted mb-2">Model not loaded</p>
          <p className="text-xs text-neutral-muted">
            Train a model first to see its information here
          </p>
        </div>
      )}
    </div>
  );
}

