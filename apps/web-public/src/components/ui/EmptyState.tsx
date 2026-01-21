import { FileQuestion, Search, FileX2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type EmptyStateType = 'no-data' | 'no-results' | 'error';

interface EmptyStateProps {
  type?: EmptyStateType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

const iconMap: Record<EmptyStateType, React.ReactNode> = {
  'no-data': <FileQuestion className="h-12 w-12 text-border-medium" />,
  'no-results': <Search className="h-12 w-12 text-border-medium" />,
  'error': <FileX2 className="h-12 w-12 text-danger" />,
};

export function EmptyState({
  type = 'no-data',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      <div className="mb-4">{iconMap[type]}</div>
      <h3 className="text-lg font-medium text-charcoal mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-steel max-w-md mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
