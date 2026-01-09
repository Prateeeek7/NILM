import { useQuery } from '@tanstack/react-query';
import { trainingApi } from '../../services/api';
import { Loading } from '../common/Loading';
import { useState } from 'react';
import { Zap, Activity, TrendingUp } from 'lucide-react';
import Plot from 'react-plotly.js';
import type { PlotData, Layout } from 'plotly.js';

interface TrainingDataPoint {
  timestamp: number;
  current: number;
  voltage: number;
  power: number;
}

interface TrainingDataRecord {
  label: string;
  data_window: TrainingDataPoint[];
}

export function LoadSignatureChart() {
  const [selectedLabel, setSelectedLabel] = useState<string | 'all'>('all');
  const [showCurrent, setShowCurrent] = useState(true);
  const [showPower, setShowPower] = useState(true);
  const [showVoltage, setShowVoltage] = useState(false);

  // Fetch all training data from JSON
  const { data: allTrainingData, isLoading, error } = useQuery({
    queryKey: ['load-signature-json', selectedLabel],
    queryFn: async () => {
      try {
        if (selectedLabel === 'all') {
          // Get more samples for better visualization
          const [fanData, bulbData, fanBulbData] = await Promise.all([
            trainingApi.getDataFromJson('fan', 30).catch((e) => {
              console.warn('Failed to fetch fan data:', e);
              return [];
            }),
            trainingApi.getDataFromJson('bulb', 30).catch((e) => {
              console.warn('Failed to fetch bulb data:', e);
              return [];
            }),
            trainingApi.getDataFromJson('fan+bulb', 30).catch((e) => {
              console.warn('Failed to fetch fan+bulb data:', e);
              return [];
            }),
          ]);
          console.log('Fetched training data:', { fan: fanData.length, bulb: bulbData.length, 'fan+bulb': fanBulbData.length });
          return { fan: fanData, bulb: bulbData, 'fan+bulb': fanBulbData };
        } else {
          const data = await trainingApi.getDataFromJson(selectedLabel, 30).catch((e) => {
            console.warn(`Failed to fetch ${selectedLabel} data:`, e);
            return [];
          });
          console.log(`Fetched ${selectedLabel} data:`, data.length, 'records');
          return { [selectedLabel]: data };
        }
      } catch (error) {
        console.error('Error fetching training data for signature:', error);
        return null;
      }
    },
    staleTime: 300000, // Cache for 5 minutes
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="bg-light-base border border-light-border rounded-lg shadow-card p-6">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-light-base border border-light-border rounded-lg shadow-card p-6">
        <h2 className="text-lg font-semibold text-neutral-darker mb-4">Load Signature Analysis</h2>
        <div className="text-center py-12 text-sm text-neutral-darker">
          Error loading training data: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    );
  }

  if (!allTrainingData) {
    return (
      <div className="bg-light-base border border-light-border rounded-lg shadow-card p-6">
        <h2 className="text-lg font-semibold text-neutral-darker mb-4">Load Signature Analysis</h2>
        <div className="text-center py-12 text-sm text-neutral-muted">
          No training data available
        </div>
      </div>
    );
  }

  // Prepare Plotly data
  const plotData: PlotData[] = [];
  const colors: Record<string, string> = {
    fan: '#3b82f6', // blue
    bulb: '#f59e0b', // amber
    'fan+bulb': '#22c55e', // green
  };

  const labels = selectedLabel === 'all' ? ['fan', 'bulb', 'fan+bulb'] : [selectedLabel];

  labels.forEach((label) => {
    const records = allTrainingData[label as keyof typeof allTrainingData] as TrainingDataRecord[];
    if (!records || records.length === 0) {
      console.log(`No records found for label: ${label}`);
      return;
    }
    console.log(`Processing ${records.length} records for label: ${label}`);

    // Combine all data windows for this label
    const allPoints: TrainingDataPoint[] = [];
    records.forEach((record) => {
      if (record.data_window && record.data_window.length > 0) {
        allPoints.push(...record.data_window);
      }
    });

    if (allPoints.length === 0) {
      console.log(`No data points found for label: ${label} (records had no data_window)`);
      return;
    }
    console.log(`Collected ${allPoints.length} data points for label: ${label}`);

    // Sort by timestamp
    allPoints.sort((a, b) => a.timestamp - b.timestamp);

    // Convert timestamps to relative time (seconds from start)
    const startTime = allPoints[0].timestamp;
    const timeData = allPoints.map((p) => (p.timestamp - startTime) / 1000); // Convert to seconds

    if (showCurrent) {
      plotData.push({
        x: timeData,
        y: allPoints.map((p) => p.current),
        type: 'scatter',
        mode: 'lines',
        name: `${label} - Current (A)`,
        line: { color: colors[label] || '#64748b', width: 2 },
        yaxis: 'y',
      });
    }

    if (showPower) {
      plotData.push({
        x: timeData,
        y: allPoints.map((p) => p.power),
        type: 'scatter',
        mode: 'lines',
        name: `${label} - Power (W)`,
        line: { color: colors[label] || '#64748b', width: 2, dash: 'dash' },
        yaxis: 'y2',
      });
    }

    if (showVoltage) {
      plotData.push({
        x: timeData,
        y: allPoints.map((p) => p.voltage),
        type: 'scatter',
        mode: 'lines',
        name: `${label} - Voltage (V)`,
        line: { color: colors[label] || '#64748b', width: 2, dash: 'dot' },
        yaxis: 'y3',
      });
    }
  });

  const layout: Partial<Layout> = {
    title: {
      text: 'Load Signature Patterns',
      font: { size: 18, color: '#1e293b' },
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#64748b', size: 12 },
    xaxis: {
      title: { text: 'Time (seconds)', font: { color: '#64748b' } },
      gridcolor: '#e2e8f0',
      zeroline: false,
    },
    yaxis: {
      title: { text: 'Current (A)', font: { color: '#3b82f6' } },
      side: 'left',
      gridcolor: '#e2e8f0',
      zeroline: false,
    },
    yaxis2: {
      title: { text: 'Power (W)', font: { color: '#22c55e' } },
      side: 'right',
      overlaying: 'y',
      gridcolor: '#e2e8f0',
      zeroline: false,
    },
    yaxis3: showVoltage
      ? {
          title: { text: 'Voltage (V)', font: { color: '#f59e0b' } },
          side: 'right',
          overlaying: 'y',
          position: 0.95,
          gridcolor: '#e2e8f0',
          zeroline: false,
        }
      : undefined,
    legend: {
      x: 0,
      y: 1,
      bgcolor: 'rgba(255,255,255,0.8)',
      bordercolor: '#e2e8f0',
      borderwidth: 1,
    },
    hovermode: 'x unified',
    margin: { l: 60, r: 60, t: 60, b: 60 },
  };

  const config = {
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    responsive: true,
  };

  return (
    <div className="bg-light-base border border-light-border rounded-lg shadow-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Zap size={20} className="text-neutral-darker" />
          <h2 className="text-lg font-semibold text-neutral-darker">Load Signature Analysis</h2>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedLabel}
            onChange={(e) => setSelectedLabel(e.target.value)}
            className="px-3 py-1 border border-light-border rounded text-sm bg-light-surface text-neutral-darker focus:outline-none focus:ring-2 focus:ring-neutral-muted"
          >
            <option value="all">All Loads</option>
            <option value="fan">Fan</option>
            <option value="bulb">Bulb</option>
            <option value="fan+bulb">Fan + Bulb</option>
          </select>
        </div>
      </div>

      {/* Toggle switches */}
      <div className="mb-4 flex items-center space-x-6 flex-wrap">
        <label className="flex items-center space-x-2 text-sm text-neutral-darker cursor-pointer">
          <input
            type="checkbox"
            checked={showCurrent}
            onChange={(e) => setShowCurrent(e.target.checked)}
            className="w-4 h-4 text-neutral-darker border-light-border rounded focus:ring-neutral-darker"
          />
          <Activity size={16} className="text-neutral-darker" />
          <span>Current (A)</span>
        </label>
        <label className="flex items-center space-x-2 text-sm text-neutral-darker cursor-pointer">
          <input
            type="checkbox"
            checked={showPower}
            onChange={(e) => setShowPower(e.target.checked)}
            className="w-4 h-4 text-neutral-darker border-light-border rounded focus:ring-neutral-darker"
          />
          <Zap size={16} className="text-neutral-darker" />
          <span>Power (W)</span>
        </label>
        <label className="flex items-center space-x-2 text-sm text-neutral-darker cursor-pointer">
          <input
            type="checkbox"
            checked={showVoltage}
            onChange={(e) => setShowVoltage(e.target.checked)}
            className="w-4 h-4 text-neutral-darker border-light-border rounded focus:ring-neutral-darker"
          />
          <TrendingUp size={16} className="text-neutral-darker" />
          <span>Voltage (V)</span>
        </label>
      </div>

      <div className="w-full" style={{ height: '500px' }}>
        {plotData.length > 0 ? (
          <Plot data={plotData} layout={layout} config={config} style={{ width: '100%', height: '100%' }} />
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-muted">
            <div className="text-center">
              <p className="mb-2">No data to display.</p>
              <p className="text-xs">Debug: plotData.length = {plotData.length}, allTrainingData keys = {allTrainingData ? Object.keys(allTrainingData).join(', ') : 'null'}</p>
              <p className="text-xs mt-2">Please check:</p>
              <ul className="text-xs text-left mt-1 list-disc list-inside">
                <li>At least one metric is selected (Current, Power, or Voltage)</li>
                <li>Training data exists for the selected load type</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-light-border text-xs text-neutral-muted">
        <p>
          Showing signature patterns for{' '}
          <span className="font-medium text-neutral-darker capitalize">
            {selectedLabel === 'all' ? 'all load types' : selectedLabel}
          </span>
        </p>
        <p className="mt-1">
          Data from training dataset
        </p>
      </div>
    </div>
  );
}
