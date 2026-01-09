import { useState, useEffect } from 'react';
import { trainingApi, TrainingStats, TrainingStatus, TrainingReadyStatus, loadsApi, Load } from '../../services/api';
import { TrainingStatsCard } from './TrainingStatsCard';
import { TrainingStatusCard } from './TrainingStatusCard';
import { TrainingDataCollection } from './TrainingDataCollection';
import { TrainingDataList } from './TrainingDataList';
import { ModelInfoCard } from '../Analytics/ModelInfoCard';

export const TrainingManagement = () => {
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [status, setStatus] = useState<TrainingStatus | null>(null);
  const [readyStatus, setReadyStatus] = useState<TrainingReadyStatus | null>(null);
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsData, statusData, readyData, loadsData] = await Promise.all([
        trainingApi.getStats(),
        trainingApi.getStatus(),
        trainingApi.checkReady(),
        loadsApi.getAll(true),
      ]);
      setStats(statsData);
      setStatus(statusData);
      setReadyStatus(readyData);
      setLoads(loadsData);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load training data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleTriggerTraining = async () => {
    if (!readyStatus?.is_ready && !confirm('Not enough data for training. Force training anyway?')) {
      return;
    }

    try {
      setError(null);
      await trainingApi.triggerTraining(readyStatus?.min_samples_per_class || 100, !readyStatus?.is_ready);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to trigger training');
    }
  };

  const handleLoadFromJson = async () => {
    if (!confirm('This will load training data from Training_data.json. Continue?')) {
      return;
    }

    try {
      setError(null);
      const result = await trainingApi.loadFromJson();
      alert(`Successfully loaded ${result.loaded} records from Training_data.json!\nSkipped: ${result.skipped}\nTotal in file: ${result.total_in_file}`);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load training data from JSON');
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-sm text-neutral-muted">Loading training data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-neutral-darker mb-1">Model Training</h2>
        <p className="text-sm text-neutral-muted">Collect training data and train your NILM model</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats && <TrainingStatsCard stats={stats} />}
        {status && <TrainingStatusCard status={status} />}
      </div>

      {/* Model Information */}
      <ModelInfoCard />

      {/* Load from JSON button */}
      <div className="bg-light-muted border border-light-border p-4 rounded">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-darker mb-1">Load Training Data from JSON</p>
            <p className="text-xs text-neutral-darker">Load training data from Training_data.json file (270 samples: 90 fan, 90 bulb, 90 fan+bulb)</p>
          </div>
          <button
            onClick={handleLoadFromJson}
            className="px-4 py-2 bg-neutral-muted text-light-base rounded hover:bg-light-muted transition-colors text-sm font-medium"
          >
            Load from JSON
          </button>
        </div>
      </div>

      {readyStatus && (
        <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold text-neutral-darker">Training Readiness</h3>
            <button
              onClick={handleTriggerTraining}
              disabled={status?.status === 'running'}
              className="px-4 py-2 bg-neutral-muted text-light-base rounded hover:bg-light-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {status?.status === 'running' ? 'Training in Progress...' : 'Start Training'}
            </button>
          </div>

          {readyStatus.is_ready ? (
            <div className="bg-light-muted border border-light-border p-4 rounded">
              <p className="text-sm text-neutral-darker font-medium">
                ✓ Ready for training! All load types have sufficient samples.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="bg-light-muted border border-light-border p-4 rounded">
                <p className="text-sm text-neutral-darker font-medium">
                  ⚠ Not ready for training. Some load types need more samples.
                </p>
              </div>
              {readyStatus.insufficient_labels.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium mb-2 text-neutral-darker">Need more samples:</p>
                  <ul className="list-disc list-inside text-xs space-y-1 text-neutral-muted">
                    {readyStatus.insufficient_labels.map((item) => (
                      <li key={item.label}>
                        {item.label}: {item.samples} samples (need {item.needed} more)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {readyStatus.ready_labels.length > 0 && (
            <div className="mt-4 pt-4 border-t border-light-border">
              <p className="text-xs font-medium mb-2 text-neutral-darker">Ready labels:</p>
              <div className="flex flex-wrap gap-2">
                {readyStatus.ready_labels.map((item) => (
                  <span
                    key={item.label}
                    className="px-2 py-1 bg-light-muted text-neutral-darker rounded text-xs font-medium capitalize"
                  >
                    {item.label}: {item.samples} samples
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <TrainingDataCollection loads={loads} onDataCollected={fetchData} />
      
      <TrainingDataList />
    </div>
  );
};

