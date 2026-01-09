import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../services/api';
import { Loading } from '../common/Loading';
import { formatEnergy } from '../../utils/formatters';
import { Leaf, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface EnergySource {
  id: string;
  name: string;
  share: string;
  co2IntensityMin: number; // g CO₂-eq/kWh
  co2IntensityMax: number; // g CO₂-eq/kWh
  co2IntensityAvg: number; // g CO₂-eq/kWh (average)
  color: string;
}

const energySources: EnergySource[] = [
  {
    id: 'coal',
    name: 'Coal-based Thermal Power',
    share: '~73%',
    co2IntensityMin: 820,
    co2IntensityMax: 1000,
    co2IntensityAvg: 910,
    color: '#64748b', // gray
  },
  {
    id: 'hydro',
    name: 'Hydropower',
    share: '~9-10%',
    co2IntensityMin: 6,
    co2IntensityMax: 100,
    co2IntensityAvg: 53,
    color: '#3b82f6', // blue
  },
  {
    id: 'solar',
    name: 'Solar PV',
    share: '~8-9%',
    co2IntensityMin: 30,
    co2IntensityMax: 50,
    co2IntensityAvg: 40,
    color: '#f59e0b', // amber
  },
  {
    id: 'wind',
    name: 'Wind Power',
    share: '~5%',
    co2IntensityMin: 8,
    co2IntensityMax: 16,
    co2IntensityAvg: 12,
    color: '#22c55e', // green
  },
  {
    id: 'nuclear',
    name: 'Nuclear Power',
    share: '~3-4%',
    co2IntensityMin: 10,
    co2IntensityMax: 20,
    co2IntensityAvg: 15,
    color: '#8b5cf6', // purple
  },
];

export function CarbonFootprint() {
  const [selectedSource, setSelectedSource] = useState<string>('coal'); // Default to coal (most common in India)

  // Load saved source from localStorage
  useEffect(() => {
    const savedSource = localStorage.getItem('carbon_footprint_energy_source');
    if (savedSource && energySources.find(s => s.id === savedSource)) {
      setSelectedSource(savedSource);
    }
  }, []);

  // Fetch training data stats
  const { data: trainingStats, isLoading } = useQuery({
    queryKey: ['training-data-stats-carbon'],
    queryFn: () => analyticsApi.getTrainingDataStats(8.0),
    refetchInterval: 60000,
    staleTime: 300000,
  });

  // Save selected source to localStorage
  const handleSourceChange = (sourceId: string) => {
    setSelectedSource(sourceId);
    localStorage.setItem('carbon_footprint_energy_source', sourceId);
  };

  const selectedEnergySource = energySources.find(s => s.id === selectedSource) || energySources[0];
  const totalEnergyKwh = trainingStats?.total_energy_kwh || 0;

  // Calculate carbon footprint
  const carbonFootprintGrams = totalEnergyKwh * selectedEnergySource.co2IntensityAvg;
  const carbonFootprintKg = carbonFootprintGrams / 1000;
  const carbonFootprintTons = carbonFootprintKg / 1000;

  // Calculate for all sources for comparison
  const comparisonData = energySources.map(source => ({
    name: source.name.split(' ')[0], // Short name for chart
    fullName: source.name,
    co2: (totalEnergyKwh * source.co2IntensityAvg) / 1000, // in kg
    intensity: source.co2IntensityAvg,
  }));

  // Format carbon footprint
  const formatCarbonFootprint = (kg: number) => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(3)} tons CO₂-eq`;
    } else if (kg >= 1) {
      return `${kg.toFixed(2)} kg CO₂-eq`;
    } else {
      return `${(kg * 1000).toFixed(1)} g CO₂-eq`;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
        <Loading />
      </div>
    );
  }

  return (
    <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Leaf size={20} className="text-neutral-darker" />
          <h2 className="text-lg font-semibold text-neutral-darker">Carbon Footprint</h2>
        </div>
        <span className="text-xs px-2 py-1 bg-light-muted text-neutral-darker rounded">
          Training Data
        </span>
      </div>

      {/* Energy Source Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-neutral-darker mb-2">
          Energy Production Source (India 2024-25)
        </label>
        <select
          value={selectedSource}
          onChange={(e) => handleSourceChange(e.target.value)}
          className="w-full px-3 py-2 border border-light-border rounded text-sm bg-light-surface text-neutral-darker focus:outline-none focus:ring-2 focus:ring-neutral-darker"
        >
          {energySources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name} ({source.share}) - Avg: {source.co2IntensityAvg} g CO₂-eq/kWh
            </option>
          ))}
        </select>
        <p className="text-xs text-neutral-muted mt-2">
          Selected: {selectedEnergySource.name} | Share in India: {selectedEnergySource.share} | 
          CO₂ Intensity: {selectedEnergySource.co2IntensityMin}-{selectedEnergySource.co2IntensityMax} g CO₂-eq/kWh
        </p>
      </div>

      {/* Main Carbon Footprint Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-light-muted rounded border border-light-border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp size={16} className="text-neutral-darker" />
            <div className="text-xs font-medium text-neutral-muted uppercase tracking-wide">Total Energy</div>
          </div>
          <div className="text-2xl font-semibold text-neutral-darker">
            {formatEnergy(totalEnergyKwh)}
          </div>
        </div>
        <div className="bg-light-muted rounded border border-light-border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Leaf size={16} className="text-neutral-darker" />
            <div className="text-xs font-medium text-neutral-muted uppercase tracking-wide">Carbon Footprint</div>
          </div>
          <div className="text-2xl font-semibold text-neutral-darker">
            {formatCarbonFootprint(carbonFootprintKg)}
          </div>
          <div className="text-xs text-neutral-muted mt-1">
            Based on {selectedEnergySource.name}
          </div>
        </div>
        <div className="bg-light-muted rounded border border-light-border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 size={16} className="text-neutral-darker" />
            <div className="text-xs font-medium text-neutral-muted uppercase tracking-wide">CO₂ Intensity</div>
          </div>
          <div className="text-2xl font-semibold text-neutral-darker">
            {selectedEnergySource.co2IntensityAvg}
          </div>
          <div className="text-xs text-neutral-muted mt-1">
            g CO₂-eq/kWh (avg)
          </div>
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="mt-6 pt-6 border-t border-light-border">
        <h3 className="text-sm font-semibold text-neutral-darker mb-4">Comparison Across Energy Sources</h3>
        <p className="text-xs text-neutral-muted mb-4">
          Carbon footprint if the same energy ({formatEnergy(totalEnergyKwh)}) was generated from different sources
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 10 }}
              style={{ fontSize: '10px' }}
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              style={{ fontSize: '10px' }}
              label={{ value: 'CO₂ (kg)', angle: -90, position: 'insideLeft', style: { fontSize: '10px' } }}
            />
            <Tooltip 
              formatter={(value: number) => `${value.toFixed(2)} kg CO₂-eq`}
              contentStyle={{ 
                fontSize: '11px',
                padding: '8px'
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullName;
                }
                return label;
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '11px' }}
              iconSize={12}
            />
            <Bar dataKey="co2" name="Carbon Footprint (kg CO₂-eq)" fill="#64748b">
              {comparisonData.map((entry, index) => {
                const source = energySources.find(s => s.name.startsWith(entry.name));
                return <Cell key={`cell-${index}`} fill={source?.color || '#64748b'} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown by Load Type */}
      {trainingStats?.load_breakdown && trainingStats.load_breakdown.length > 0 && (
        <div className="mt-6 pt-6 border-t border-light-border">
          <h3 className="text-sm font-semibold text-neutral-darker mb-4">Carbon Footprint by Load Type</h3>
          <div className="space-y-2">
            {trainingStats.load_breakdown.map((item: any, index: number) => {
              const loadCarbonKg = (item.energy_kwh * selectedEnergySource.co2IntensityAvg) / 1000;
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-light-base rounded border border-light-border"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-neutral-darker capitalize">{item.load_type}</div>
                    <div className="text-xs text-neutral-muted">
                      {formatEnergy(item.energy_kwh)} ({item.percentage?.toFixed(1) || 0}%)
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-neutral-darker">
                    {formatCarbonFootprint(loadCarbonKg)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className="mt-6 pt-4 border-t border-light-border text-xs text-neutral-muted">
        <p className="mb-1">
          <strong>Note:</strong> Carbon footprint calculations are based on lifecycle CO₂-equivalent emissions 
          (including manufacturing, operation, and decommissioning) for each energy source.
        </p>
        <p>
          Data from training dataset ({trainingStats?.total_samples || 0} samples) | 
          Energy consumption: {formatEnergy(totalEnergyKwh)}
        </p>
      </div>
    </div>
  );
}

