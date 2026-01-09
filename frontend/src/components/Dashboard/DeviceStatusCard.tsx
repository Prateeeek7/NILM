import { useQuery } from '@tanstack/react-query';
import { dataApi } from '../../services/api';
import { DeviceStatusResponse } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { Radio, Wifi } from 'lucide-react';

export function DeviceStatusCard() {
  const { data: status, isLoading } = useQuery<DeviceStatusResponse>({
    queryKey: ['device-status'],
    queryFn: () => dataApi.getDeviceStatus(),
    refetchInterval: 5000, // Update every 5 seconds
  });

  if (isLoading) {
    return (
      <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-neutral-darker border-t-transparent"></div>
          <span className="text-sm text-neutral-muted">Loading device status...</span>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
        <div className="text-sm text-neutral-darker">Unable to fetch device status</div>
      </div>
    );
  }

  const devices = status.devices || [];
  const onlineDevices = devices.filter(d => d.online).length;

  return (
    <div className="bg-light-base rounded border border-light-border p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-darker">ESP32 Connection Status</h3>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded ${
          status.mqtt_connected 
            ? 'bg-light-muted text-neutral-darker' 
            : 'bg-light-muted text-neutral-darker'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            status.mqtt_connected ? 'bg-neutral-muted' : 'bg-light-muted'
          }`}></div>
          <span className="text-xs font-medium">
            {status.mqtt_connected ? 'MQTT Connected' : 'MQTT Disconnected'}
          </span>
        </div>
      </div>

      {!status.mqtt_connected && (
        <div className="mb-4 p-3 bg-light-muted border-l-4 border-light-border rounded">
          <p className="text-xs text-neutral-darker">
            MQTT broker is not connected. ESP32 devices cannot send data.
          </p>
        </div>
      )}

      {devices.length === 0 ? (
        <div className="text-center py-8">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-light-muted flex items-center justify-center">
              <Radio size={24} className="text-neutral-muted" />
            </div>
          </div>
          <p className="text-sm text-neutral-muted mb-2">No devices detected</p>
          <p className="text-xs text-neutral-muted">
            Make sure your ESP32 is powered on and connected to WiFi
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs mb-4">
            <span className="text-neutral-muted">Connected Devices:</span>
            <span className="font-semibold text-neutral-darker">
              {onlineDevices} / {devices.length} Online
            </span>
          </div>
          
          {devices.map((device) => (
            <div
              key={device.device_id}
              className={`border rounded p-4 transition-shadow ${
                device.online
                  ? 'border-light-border bg-light-muted'
                  : 'border-light-border bg-light-muted'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    device.online
                      ? 'bg-neutral-muted'
                      : 'bg-light-border'
                  }`}></div>
                  <span className="font-semibold text-sm text-neutral-darker">{device.device_id}</span>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded ${
                  device.online
                    ? 'bg-neutral-muted text-light-base'
                    : 'bg-light-border text-neutral-muted'
                }`}>
                  {device.online ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              
              {/* WiFi Status */}
              {device.wifi && (
                <div className="mt-2 pt-2 border-t border-light-border">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1">
                      <Wifi size={12} className="text-neutral-muted" />
                      <span className="text-neutral-muted">WiFi:</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        device.wifi.connected ? 'bg-neutral-muted' : 'bg-light-muted'
                      }`}></div>
                      <span className={device.wifi.connected ? 'text-neutral-darker' : 'text-neutral-darker'}>
                        {device.wifi.connected ? device.wifi.ssid || 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>
                  {device.wifi.connected && device.wifi.rssi && (
                    <div className="text-xs text-neutral-muted mt-1">
                      Signal: {device.wifi.rssi} dBm | IP: {device.wifi.ip}
                    </div>
                  )}
                </div>
              )}
              
              {device.last_seen && (
                <div className="text-xs text-neutral-muted mt-1">
                  Last seen: {formatDistanceToNow(new Date(device.last_seen), { addSuffix: true })}
                </div>
              )}
              
              {!device.online && device.last_seen && (
                <div className="text-xs text-neutral-darker mt-1">
                  No data received for more than 30 seconds
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

