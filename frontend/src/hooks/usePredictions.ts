import { useQuery } from '@tanstack/react-query';
import { predictionsApi } from '../services/api';

export function usePredictions(deviceId?: string) {
  return useQuery({
    queryKey: ['predictions', 'live', deviceId],
    queryFn: () => predictionsApi.getLive(deviceId),
    refetchInterval: 5000, // Refetch every 5 seconds
  });
}





