'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = generatePageNumbers(currentPage, totalPages);

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(
          'inline-flex items-center justify-center rounded-md p-2 text-sm',
          currentPage === 1
            ? 'text-border-medium cursor-not-allowed'
            : 'text-steel hover:bg-light hover:text-charcoal'
        )}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((page, index) => (
        <span key={index}>
          {page === '...' ? (
            <span className="px-3 py-2 text-sm text-steel">...</span>
          ) : (
            <button
              onClick={() => onPageChange(page as number)}
              className={cn(
                'inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium min-w-[40px]',
                currentPage === page
                  ? 'bg-primary text-primary-foreground'
                  : 'text-steel hover:bg-light hover:text-charcoal'
              )}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          )}
        </span>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(
          'inline-flex items-center justify-center rounded-md p-2 text-sm',
          currentPage === totalPages
            ? 'text-border-medium cursor-not-allowed'
            : 'text-steel hover:bg-light hover:text-charcoal'
        )}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

function generatePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (current <= 3) {
    return [1, 2, 3, 4, 5, '...', total];
  }

  if (current >= total - 2) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, '...', current - 1, current, current + 1, '...', total];
}
