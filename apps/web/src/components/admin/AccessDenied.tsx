'use client';

import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui';

interface AccessDeniedProps {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export function AccessDenied({
  title = "You don't have access to this page",
  description = "Your role doesn't have permission to view or manage this section. Contact a Super Admin if you need access.",
  backHref = '/admin',
  backLabel = 'Back to Dashboard',
}: AccessDeniedProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center py-16 px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-full bg-warning/10 flex items-center justify-center">
            <ShieldAlert className="h-10 w-10 text-warning" />
          </div>
        </div>
        <h1 className="font-heading text-h2 text-charcoal mb-3">{title}</h1>
        <p className="text-steel mb-8">{description}</p>
        <Link href={backHref}>
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Button>
        </Link>
      </div>
    </div>
  );
}
