import { cn } from '@/lib/utils';

type AlertVariant = 'error' | 'warning' | 'success' | 'info';

interface AlertProps {
  children: React.ReactNode;
  variant?: AlertVariant;
  className?: string;
}

const variantStyles: Record<AlertVariant, string> = {
  error: 'bg-danger/10 border-danger text-danger',
  warning: 'bg-warning/10 border-warning text-charcoal',
  success: 'bg-success/10 border-success text-charcoal',
  info: 'bg-light border-border-medium text-charcoal',
};

export function Alert({ children, variant = 'error', className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-md border px-4 py-3 text-sm',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </div>
  );
}
