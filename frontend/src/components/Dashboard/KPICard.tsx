import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'info' | 'success' | 'warning' | 'error';
}

const colorConfig = {
  info: {
    bg: 'bg-light-muted',
    border: 'border-light-border',
    text: 'text-neutral-darker',
    iconBg: 'bg-light-muted',
    iconColor: 'text-neutral-muted',
  },
  success: {
    bg: 'bg-light-muted',
    border: 'border-light-border',
    text: 'text-neutral-darker',
    iconBg: 'bg-light-muted',
    iconColor: 'text-neutral-muted',
  },
  warning: {
    bg: 'bg-light-muted',
    border: 'border-light-border',
    text: 'text-neutral-darker',
    iconBg: 'bg-light-muted',
    iconColor: 'text-neutral-muted',
  },
  error: {
    bg: 'bg-light-muted',
    border: 'border-light-border',
    text: 'text-neutral-darker',
    iconBg: 'bg-light-muted',
    iconColor: 'text-neutral-muted',
  },
};

export function KPICard({ title, value, unit, icon, trend, color = 'info' }: KPICardProps) {
  const colors = colorConfig[color];

  return (
    <div className={`bg-light-base rounded border ${colors.border} p-6 shadow-card hover:shadow-card-hover transition-shadow`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded ${colors.iconBg} flex items-center justify-center ${colors.iconColor}`}>
          {icon}
        </div>
        {trend && (
          <div className="flex items-center space-x-1 text-sm font-semibold text-neutral-muted">
            {trend.isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div className="mb-2">
        <p className="text-xs font-medium text-neutral-muted uppercase tracking-wide">{title}</p>
      </div>
      <div className="flex items-baseline space-x-2">
        <p className={`text-2xl font-semibold ${colors.text}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {unit && (
          <span className={`text-sm font-medium text-neutral-muted`}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

