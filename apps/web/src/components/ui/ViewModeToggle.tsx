'use client';

import { Grid3X3, List } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

const STORAGE_PREFIX = 'slms-view-mode';

export type ViewMode = 'grid' | 'table';

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  /** If set, preference is persisted to localStorage under this key */
  storageKey?: string;
  className?: string;
  ariaLabel?: string;
}

export function ViewModeToggle({
  value,
  onChange,
  storageKey,
  className,
  ariaLabel = 'View mode',
}: ViewModeToggleProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const persistAndChange = useCallback(
    (mode: ViewMode) => {
      if (storageKey && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(`${STORAGE_PREFIX}-${storageKey}`, mode);
        } catch {
          // ignore
        }
      }
      onChange(mode);
    },
    [onChange, storageKey]
  );

  useEffect(() => {
    if (!mounted || !storageKey || typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(`${STORAGE_PREFIX}-${storageKey}`) as ViewMode | null;
      if (stored === 'grid' || stored === 'table') {
        onChange(stored);
      }
    } catch {
      // ignore
    }
  }, [mounted, storageKey, onChange]);

  return (
    <div
      className={cn('flex items-center border border-border-medium rounded-md overflow-hidden', className)}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={() => persistAndChange('grid')}
        className={cn(
          'p-2 transition-colors',
          value === 'grid' ? 'bg-primary text-white' : 'hover:bg-light text-charcoal'
        )}
        aria-label="Grid view"
        aria-pressed={value === 'grid'}
      >
        <Grid3X3 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => persistAndChange('table')}
        className={cn(
          'p-2 transition-colors',
          value === 'table' ? 'bg-primary text-white' : 'hover:bg-light text-charcoal'
        )}
        aria-label="Table view"
        aria-pressed={value === 'table'}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Read initial view mode from localStorage (for SSR-safe default). Call only on client or use 'table' as fallback. */
export function getStoredViewMode(storageKey: string): ViewMode {
  if (typeof window === 'undefined') return 'table';
  try {
    const stored = window.localStorage.getItem(`${STORAGE_PREFIX}-${storageKey}`);
    return stored === 'grid' ? 'grid' : 'table';
  } catch {
    return 'table';
  }
}
