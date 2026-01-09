import { RealtimeData } from '../types';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private listeners: Set<(data: RealtimeData) => void> = new Set();
  private deviceId?: string;

  connect(deviceId?: string) {
    this.deviceId = deviceId;
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    const url = deviceId ? `${wsUrl}/ws?device_id=${deviceId}` : `${wsUrl}/ws`;
    
    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data: RealtimeData = JSON.parse(event.data);
          this.notifyListeners(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        // Only log if not already attempting reconnect
        if (this.reconnectAttempts === 0) {
          console.error('WebSocket error:', error);
        }
      };

      this.ws.onclose = (event) => {
        // Only log if it wasn't a clean close
        if (event.code !== 1000) {
          console.log('WebSocket disconnected');
        }
        this.ws = null;
        // Only attempt reconnect if not a clean close
        if (event.code !== 1000) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('Error connecting WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      // Only log first few reconnection attempts
      if (this.reconnectAttempts <= 2) {
        console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      }
      setTimeout(() => {
        this.connect(this.deviceId);
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached. WebSocket unavailable.');
    }
  }

  subscribe(callback: (data: RealtimeData) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(data: RealtimeData) {
    this.listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in WebSocket listener:', error);
      }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const wsService = new WebSocketService();

