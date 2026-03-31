import React from 'react';
import { cn } from '../utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  size?: 'sm' | 'md';
}

const variantStyles = {
  success: 'bg-green-100 text-green-800 border border-green-200',
  warning: 'bg-orange-100 text-orange-800 border border-orange-200',
  danger: 'bg-red-100 text-red-800 border border-red-200',
  info: 'bg-blue-100 text-blue-800 border border-blue-200',
  default: 'bg-gray-100 text-gray-800 border border-gray-200',
};

const sizeStyles = {
  sm: 'px-2.5 py-0.5 text-xs font-medium',
  md: 'px-3 py-1 text-sm font-medium',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'sm', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-block rounded-full whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  )
);

Badge.displayName = 'Badge';

// Status pill variant - commonly used for order status, batch status, etc.
interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
}

export const StatusPill = React.forwardRef<HTMLSpanElement, StatusPillProps>(
  ({ className, status, ...props }, ref) => {
    let variant: BadgeProps['variant'] = 'default';

    if (['active', 'delivered', 'paid', 'success', 'completed'].includes(status.toLowerCase())) {
      variant = 'success';
    } else if (['pending', 'processing', 'scheduled'].includes(status.toLowerCase())) {
      variant = 'info';
    } else if (['warning', 'low_stock', 'urgent'].includes(status.toLowerCase())) {
      variant = 'warning';
    } else if (
      ['failed', 'cancelled', 'returned', 'danger', 'culled'].includes(status.toLowerCase())
    ) {
      variant = 'danger';
    }

    return (
      <Badge ref={ref} variant={variant} className={className} {...props}>
        {status}
      </Badge>
    );
  }
);

StatusPill.displayName = 'StatusPill';
