import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { trainingApi } from '../../services/api';
import { Loading } from '../common/Loading';
import { format } from 'date-fns';
import { Database, Filter, RefreshCw, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

export function TrainingDataList() {
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const [limit, setLimit] = useState<number>(100);

  const { data: trainingData, isLoading, refetch } = useQuery({
    queryKey: ['training-data', selectedLabel, limit],
    queryFn: () => trainingApi.getData(selectedLabel || undefined, limit),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: stats } = useQuery({
    queryKey: ['training-stats'],
    queryFn: () => trainingApi.getStats(),
  });

  // Get unique labels from stats
  const uniqueLabels = stats?.samples_by_label 
    ? Object.keys(stats.samples_by_label).sort()
    : [];

  return (
    <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Database size={24} className="text-info" />
          <div>
            <h3 className="text-lg font-semibold text-neutral-darker">Training Data Records</h3>
            <p className="text-xs text-neutral-muted">View all collected training data samples</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center space-x-2 px-3 py-2 bg-info text-info-light rounded hover:bg-info-dark transition-colors text-sm font-medium"
        >
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter size={16} className="text-neutral-muted" />
          <label className="text-sm text-neutral-darker font-medium">Filter by Label:</label>
          <select
            value={selectedLabel}
            onChange={(e) => setSelectedLabel(e.target.value)}
            className="px-3 py-1 border border-light-border rounded text-sm bg-light-surface text-neutral-darker focus:outline-none focus:ring-2 focus:ring-info"
          >
            <option value="">All Labels</option>
            {uniqueLabels.map((label) => (
              <option key={label} value={label}>
                {label} ({stats?.samples_by_label[label] || 0})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-neutral-darker font-medium">Limit:</label>
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="px-3 py-1 border border-light-border rounded text-sm bg-light-surface text-neutral-darker focus:outline-none focus:ring-2 focus:ring-info"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
          </select>
        </div>
        {stats && (
          <div className="ml-auto flex items-center space-x-2 text-sm text-neutral-muted">
            <TrendingUp size={16} />
            <span>Total: {stats.total_samples} samples</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <Loading />
      ) : !trainingData || trainingData.length === 0 ? (
        <div className="text-center py-12">
          <Database size={48} className="text-neutral-muted mx-auto mb-4" />
          <p className="text-sm text-neutral-muted mb-2">No training data found</p>
          <p className="text-xs text-neutral-muted">
            {selectedLabel 
              ? `No data for label: ${selectedLabel}`
              : 'Start collecting training data to see records here'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-border bg-light-base">
                  <th className="text-left py-3 px-4 font-semibold text-neutral-darker">ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-darker">Label</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-darker">Samples</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-darker">Device ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-darker">Load ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-darker">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {trainingData.map((record: any) => (
                  <tr
                    key={record.id}
                    className="border-b border-light-border hover:bg-light-base transition-colors"
                  >
                    <td className="py-3 px-4 text-neutral-muted font-mono text-xs">
                      #{record.id}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={clsx(
                          "px-2 py-1 rounded text-xs font-medium capitalize",
                          record.label === 'fan'
                            ? 'bg-light-muted text-neutral-darker'
                            : record.label === 'bulb'
                            ? 'bg-light-muted text-neutral-darker'
                            : record.label === 'fan+bulb'
                            ? 'bg-light-muted text-neutral-darker'
                            : 'bg-light-muted text-light-surface'
                        )}
                      >
                        {record.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-darker font-medium">
                      {record.samples_count || 0}
                    </td>
                    <td className="py-3 px-4 text-neutral-muted text-xs font-mono">
                      {record.device_id || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-neutral-muted">
                      {record.load_id ? `#${record.load_id}` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-neutral-muted text-xs">
                      {record.timestamp
                        ? format(new Date(record.timestamp), 'MMM dd, yyyy HH:mm:ss')
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 pt-4 border-t border-light-border text-xs text-neutral-muted">
            Showing {trainingData.length} of {stats?.total_samples || 0} total samples
            {selectedLabel && ` (filtered by: ${selectedLabel})`}
          </div>
        </>
      )}
    </div>
  );
}



