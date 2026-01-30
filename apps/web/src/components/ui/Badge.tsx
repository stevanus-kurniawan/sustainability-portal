import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-light text-charcoal',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-primary/10 text-primary',
  outline: 'bg-transparent border border-border-medium text-steel',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { variant: BadgeVariant; label: string }> = {
    ACTIVE: { variant: 'success', label: 'Active' },
    EXPIRING: { variant: 'warning', label: 'Expiring Soon' },
    EXPIRED: { variant: 'danger', label: 'Expired' },
    OPEN: { variant: 'info', label: 'Open' },
    IN_REVIEW: { variant: 'warning', label: 'In Review' },
    CLOSED: { variant: 'default', label: 'Closed' },
    DRAFT: { variant: 'outline', label: 'Draft' },
    Published: { variant: 'success', label: 'Published' },
    APPROVED: { variant: 'success', label: 'Approved' },
    REJECTED: { variant: 'danger', label: 'Rejected' },
  };
  const config = statusConfig[status] || { variant: 'default' as BadgeVariant, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
