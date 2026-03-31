import React from 'react';
import { cn } from '../utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, header, footer, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('bg-white border border-gray-200 rounded-lg shadow-sm', className)}
      {...props}
    >
      {header && <div className="border-b border-gray-200 px-6 py-4">{header}</div>}
      <div className="px-6 py-4">{children}</div>
      {footer && <div className="border-t border-gray-200 px-6 py-4">{footer}</div>}
    </div>
  )
);

Card.displayName = 'Card';
