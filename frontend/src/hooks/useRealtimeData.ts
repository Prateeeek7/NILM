import { useState, useEffect } from 'react';
import { wsService } from '../services/websocket';
import { RealtimeData } from '../types';

export function useRealtimeData(deviceId?: string) {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    wsService.connect(deviceId);
    setIsConnected(wsService.isConnected());

    const unsubscribe = wsService.subscribe((newData) => {
      setData(newData);
      setIsConnected(wsService.isConnected());
    });

    return () => {
      unsubscribe();
      wsService.disconnect();
    };
  }, [deviceId]);

  return { data, isConnected };
}





