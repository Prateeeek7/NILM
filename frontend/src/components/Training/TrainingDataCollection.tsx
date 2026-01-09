import { useState, useEffect } from 'react';
import { trainingApi, Load } from '../../services/api';
import { useRealtimeData } from '../../hooks/useRealtimeData';

interface TrainingDataCollectionProps {
  loads: Load[];
  onDataCollected: () => void;
}

export const TrainingDataCollection = ({ loads, onDataCollected }: TrainingDataCollectionProps) => {
  const [isCollecting, setIsCollecting] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<number | null>(null);
  const [dataWindow, setDataWindow] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const { data: realtimeData } = useRealtimeData();

  useEffect(() => {
    if (isCollecting && realtimeData?.data) {
      setDataWindow(prev => {
        const newWindow = [...prev, realtimeData.data];
        // Keep last 50 samples (5 seconds at 10Hz)
        return newWindow.slice(-50);
      });
    }
  }, [realtimeData, isCollecting]);

  const handleStartCollection = () => {
    if (!selectedLoad) {
      alert('Please select a load first');
      return;
    }
    setIsCollecting(true);
    setDataWindow([]);
  };

  const handleStopCollection = async () => {
    if (dataWindow.length < 10) {
      alert('Not enough data collected. Need at least 10 samples.');
      setIsCollecting(false);
      return;
    }

    const load = loads.find(l => l.id === selectedLoad);
    if (!load) return;

    try {
      await trainingApi.createData({
        device_id: realtimeData?.data?.device_id || 'unknown',
        data_window: dataWindow.map(d => ({
          current: d.current,
          voltage: d.voltage,
          power: d.power,
        })),
        label: load.load_type,
        load_id: load.id,
        notes: notes || undefined,
      });

      alert(`Training data collected: ${dataWindow.length} samples for ${load.name}`);
      setIsCollecting(false);
      setDataWindow([]);
      setNotes('');
      onDataCollected();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save training data');
    }
  };

  return (
    <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
      <h3 className="text-base font-semibold text-neutral-darker mb-4">Collect Training Data</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-neutral-darker mb-2">
            Select Load to Collect Data For
          </label>
          <select
            value={selectedLoad || ''}
            onChange={(e) => setSelectedLoad(parseInt(e.target.value))}
            disabled={isCollecting}
            className="w-full px-3 py-2 border border-light-border rounded bg-light-surface text-neutral-darker text-sm focus:outline-none focus:ring-2 focus:ring-info"
          >
            <option value="">-- Select Load --</option>
            {loads.map(load => (
              <option key={load.id} value={load.id}>
                {load.name} ({load.load_type})
              </option>
            ))}
          </select>
        </div>

        {isCollecting && (
          <div className="bg-light-muted border border-light-border p-4 rounded">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm text-neutral-darker">Collecting data...</div>
                <div className="text-xs text-neutral-darker">Samples: {dataWindow.length}</div>
              </div>
              <div className="animate-pulse w-3 h-3 bg-neutral-muted rounded-full" />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-neutral-darker mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isCollecting}
            rows={2}
            className="w-full px-3 py-2 border border-light-border rounded bg-light-surface text-neutral-darker text-sm focus:outline-none focus:ring-2 focus:ring-neutral-darker"
            placeholder="Add any notes about this data collection..."
          />
        </div>

        <div className="flex space-x-3">
          {!isCollecting ? (
            <button
              onClick={handleStartCollection}
              disabled={!selectedLoad}
              className="px-4 py-2 bg-neutral-muted text-light-base rounded hover:bg-light-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              Start Collection
            </button>
          ) : (
            <button
              onClick={handleStopCollection}
              className="px-4 py-2 bg-neutral-muted text-light-base rounded hover:bg-light-muted text-sm font-medium transition-colors"
            >
              Stop & Save
            </button>
          )}
        </div>

        <div className="text-xs text-neutral-muted mt-4 pt-4 border-t border-light-border">
          <p className="font-medium text-neutral-darker mb-2">Instructions:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Select the load you want to collect data for</li>
            <li>Turn on the selected load</li>
            <li>Click "Start Collection" and wait 5-10 seconds</li>
            <li>Click "Stop & Save" to save the training data</li>
            <li>Repeat for different loads and conditions</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

