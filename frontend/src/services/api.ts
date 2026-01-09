import axios from 'axios';
import { 
  SensorReading, 
  AnalyticsResponse, 
  LoadPrediction, 
  Load, 
  LoadCreate,
  TrainingData,
  TrainingStats,
  TrainingStatus,
  TrainingReadyStatus
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const dataApi = {
  getRealtime: async (deviceId?: string): Promise<SensorReading> => {
    const response = await api.get('/api/v1/data/realtime', {
      params: { device_id: deviceId },
    });
    return response.data;
  },

  getHistorical: async (
    startTime: string,
    endTime: string,
    deviceId?: string,
    limit = 1000
  ) => {
    const response = await api.get('/api/v1/data/historical', {
      params: {
        start_time: startTime,
        end_time: endTime,
        device_id: deviceId,
        limit,
      },
    });
    return response.data;
  },

  getDeviceStatus: async (deviceId?: string) => {
    const response = await api.get('/api/v1/data/status', {
      params: { device_id: deviceId },
    });
    return response.data;
  },
};

export const predictionsApi = {
  getLive: async (deviceId?: string) => {
    const response = await api.get('/api/v1/predictions/live', {
      params: { device_id: deviceId },
    });
    return response.data;
  },

  predict: async (data: Array<{ current: number; voltage: number; power: number }>) => {
    const response = await api.post('/api/v1/predictions/predict', data);
    return response.data as LoadPrediction;
  },
};

export const analyticsApi = {
  getEnergyBreakdown: async (
    startTime: string,
    endTime: string,
    deviceId?: string
  ): Promise<AnalyticsResponse> => {
    const response = await api.get('/api/v1/analytics/energy', {
      params: {
        start_time: startTime,
        end_time: endTime,
        device_id: deviceId,
      },
    });
    return response.data;
  },

  getCostEstimation: async (
    startTime: string,
    endTime: string,
    deviceId?: string,
    ratePerKwh = 0.12
  ) => {
    const response = await api.get('/api/v1/analytics/cost', {
      params: {
        start_time: startTime,
        end_time: endTime,
        device_id: deviceId,
        rate_per_kwh: ratePerKwh,
      },
    });
    return response.data;
  },

  getRealtimeStats: async (deviceId?: string) => {
    const response = await api.get('/api/v1/analytics/realtime', {
      params: { device_id: deviceId },
    });
    return response.data;
  },

  getTrainingDataStats: async (ratePerKwh = 8.0) => {
    const response = await api.get('/api/v1/analytics/training-data-stats', {
      params: { rate_per_kwh: ratePerKwh },
    });
    return response.data;
  },
};

export const modelApi = {
  getInfo: async () => {
    const response = await api.get('/api/v1/ml/model/info');
    return response.data;
  },
};

export const loadsApi = {
  getAll: async (activeOnly = false): Promise<Load[]> => {
    const response = await api.get('/api/loads', {
      params: { active_only: activeOnly },
    });
    return response.data;
  },

  getById: async (id: number): Promise<Load> => {
    const response = await api.get(`/api/loads/${id}`);
    return response.data;
  },

  create: async (load: LoadCreate): Promise<Load> => {
    const response = await api.post('/api/loads', load);
    return response.data;
  },

  update: async (id: number, load: Partial<LoadCreate>): Promise<Load> => {
    const response = await api.put(`/api/loads/${id}`, load);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/loads/${id}`);
  },

  getByType: async (loadType: string): Promise<Load[]> => {
    const response = await api.get(`/api/loads/type/${loadType}`);
    return response.data;
  },
};

export const trainingApi = {
  createData: async (data: {
    device_id: string;
    data_window: Array<{ current: number; voltage: number; power: number }>;
    label: string;
    load_id?: number;
    notes?: string;
  }): Promise<TrainingData> => {
    const response = await api.post('/api/training/data', data);
    return response.data;
  },

  getData: async (label?: string, limit = 100, includeDataWindow = false): Promise<TrainingData[]> => {
    const response = await api.get('/api/training/data', {
      params: { label, limit, include_data_window: includeDataWindow },
    });
    return response.data;
  },

  getStats: async (): Promise<TrainingStats> => {
    const response = await api.get('/api/training/stats');
    return response.data;
  },

  checkReady: async (minSamples = 100): Promise<TrainingReadyStatus> => {
    const response = await api.get('/api/training/ready', {
      params: { min_samples: minSamples },
    });
    return response.data;
  },

  triggerTraining: async (minSamplesPerClass = 100, forceRetrain = false): Promise<TrainingStatus> => {
    const response = await api.post('/api/training/trigger', {
      min_samples_per_class: minSamplesPerClass,
      force_retrain: forceRetrain,
    });
    return response.data;
  },

  getStatus: async (): Promise<TrainingStatus> => {
    const response = await api.get('/api/training/status');
    return response.data;
  },

  loadFromJson: async (jsonPath?: string): Promise<{ message: string; loaded: number; skipped: number; total_in_file: number }> => {
    const response = await api.post('/api/training/load-from-json', null, {
      params: { json_path: jsonPath },
    });
    return response.data;
  },

  getDataFromJson: async (label?: string, limit?: number): Promise<any[]> => {
    const response = await api.get('/api/training/data/json', {
      params: { label, limit },
    });
    return response.data;
  },
};

