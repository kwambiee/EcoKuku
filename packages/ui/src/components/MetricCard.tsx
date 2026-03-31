import React from 'react';
import { cn } from '../utils';

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  trendLabel?: string;
}

export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ className, label, value, icon, trend, trendValue, trendLabel, ...props }, ref) => {
    const trendColor = {
      up: 'text-green-600',
      down: 'text-red-600',
      neutral: 'text-gray-600',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-white border border-gray-200 rounded-lg p-6 shadow-sm',
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {trend && trendValue && (
                <span className={cn('text-sm font-medium', trendColor[trend])}>
                  {trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''} {trendValue}
                </span>
              )}
            </div>
            {trendLabel && <p className="text-xs text-gray-500 mt-1">{trendLabel}</p>}
          </div>
          {icon && <div className="flex-shrink-0 ml-4">{icon}</div>}
        </div>
      </div>
    );
  }
);

MetricCard.displayName = 'MetricCard';
