import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dataApi } from '../../services/api';
import { DeviceStatusResponse } from '../../types';
import { LayoutDashboard, TrendingUp, Zap, Cpu } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { path: '/analytics', label: 'Analytics', icon: <TrendingUp size={20} /> },
  { path: '/loads', label: 'Load Management', icon: <Zap size={20} /> },
  { path: '/training', label: 'Model Training', icon: <Cpu size={20} /> },
];

export function Sidebar() {
  const location = useLocation();
  const { data: deviceStatus } = useQuery<DeviceStatusResponse>({
    queryKey: ['device-status'],
    queryFn: () => dataApi.getDeviceStatus(),
    refetchInterval: 10000, // Update every 10 seconds
  });

  const mqttConnected = deviceStatus?.mqtt_connected ?? false;
  const onlineDevices = deviceStatus?.devices?.filter(d => d.online).length ?? 0;
  const totalDevices = deviceStatus?.devices?.length ?? 0;

  return (
    <div className="w-64 bg-light-base border-r border-light-border min-h-screen fixed left-0 top-0 shadow-sm">
      {/* Logo/Header */}
      <div className="p-6 border-b border-light-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-neutral-dark text-light-base rounded flex items-center justify-center font-semibold">
            N
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-darker">NILM System</h1>
            <p className="text-xs text-neutral-muted">DC Load Monitor</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1 mt-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center space-x-3 px-4 py-2.5 rounded transition-colors
                ${
                  isActive
                    ? 'bg-light-hover text-neutral-darker'
                    : 'text-neutral-muted hover:bg-light-hover hover:text-neutral-dark'
                }
              `}
            >
              <span className={isActive ? 'text-neutral-darker' : 'text-neutral-muted'}>{item.icon}</span>
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* System Status */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-light-border bg-light-surface space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              mqttConnected 
                ? 'bg-success animate-pulse' 
                : 'bg-error'
            }`}></div>
            <span className="text-neutral-dark">
              {mqttConnected ? 'MQTT Connected' : 'MQTT Offline'}
            </span>
          </div>
        </div>
        {totalDevices > 0 && (
          <>
            <div className="text-xs text-neutral-muted">
              ESP32: {onlineDevices}/{totalDevices} Online
            </div>
            {deviceStatus?.devices?.[0]?.wifi && (
              <div className="flex items-center space-x-2 text-xs text-neutral-muted">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  deviceStatus.devices[0].wifi.connected 
                    ? 'bg-success' 
                    : 'bg-error'
                }`}></div>
                <span>
                  WiFi: {deviceStatus.devices[0].wifi.connected 
                    ? deviceStatus.devices[0].wifi.ssid || 'Connected'
                    : 'Disconnected'}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

