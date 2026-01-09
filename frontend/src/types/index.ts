export interface SensorReading {
  device_id: string;
  timestamp: number;
  current: number;
  voltage: number;
  power: number;
}

export interface LoadPrediction {
  load_type: string;
  confidence: number;
  timestamp: string;
  features?: Record<string, number>;
  load_id?: number;
}

export interface EnergyBreakdown {
  load_type: string;
  energy_kwh: number;
  percentage: number;
  cost_usd?: number;
}

export interface AnalyticsResponse {
  total_energy_kwh: number;
  breakdown: EnergyBreakdown[];
  time_range: {
    start: string;
    end: string;
  };
  total_cost_usd?: number;
}

export interface RealtimeData {
  type: string;
  data: SensorReading;
  prediction: LoadPrediction | null;
  timestamp: string;
}

export interface Load {
  id: number;
  name: string;
  load_type: string;
  expected_power_watts: number;
  expected_current_amps: number;
  power_tolerance_percent: number;
  current_tolerance_percent: number;
  min_power_watts?: number;
  max_power_watts?: number;
  min_current_amps?: number;
  max_current_amps?: number;
  description?: string;
  manufacturer?: string;
  model_number?: string;
  specifications?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface LoadCreate {
  name: string;
  load_type: string;
  expected_power_watts: number;
  expected_current_amps: number;
  power_tolerance_percent?: number;
  current_tolerance_percent?: number;
  min_power_watts?: number;
  max_power_watts?: number;
  min_current_amps?: number;
  max_current_amps?: number;
  description?: string;
  manufacturer?: string;
  model_number?: string;
  specifications?: Record<string, any>;
}

export interface TrainingData {
  id: number;
  device_id: string;
  label: string;
  load_id?: number;
  timestamp: string;
  samples_count: number;
}

export interface TrainingStats {
  total_samples: number;
  samples_by_label: Record<string, number>;
  unique_labels: number;
}

export interface TrainingStatus {
  session_id?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress_percent: number;
  samples_used: number;
  accuracy?: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

export interface TrainingReadyStatus {
  is_ready: boolean;
  ready_labels: Array<{ label: string; samples: number }>;
  insufficient_labels: Array<{ label: string; samples: number; needed: number }>;
  min_samples_per_class: number;
}

export interface WiFiInfo {
  connected: boolean;
  ssid: string;
  rssi: number;
  ip: string;
}

export interface DeviceStatus {
  device_id: string;
  online: boolean;
  last_seen: string | null;
  wifi: WiFiInfo;
  mqtt_connected?: boolean;
}

export interface DeviceStatusResponse {
  mqtt_connected: boolean;
  devices: DeviceStatus[];
  message?: string;
  error?: string;
}

