'use client';

import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-16">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-full bg-danger/10 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-danger" />
          </div>
        </div>
        <h1 className="font-heading text-h1 text-charcoal mb-4">Something Went Wrong</h1>
        <p className="text-lg text-steel mb-8 max-w-md mx-auto">
          We encountered an unexpected error. Please try again or return to the homepage.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <button onClick={reset} className="btn-primary px-6 py-3">
            <RefreshCw className="mr-2 h-5 w-5" />
            Try Again
          </button>
          <Link href="/" className="btn-outline px-6 py-3">
            <Home className="mr-2 h-5 w-5" />
            Back to Home
          </Link>
        </div>
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mt-8 p-4 bg-danger/5 rounded-lg max-w-xl mx-auto">
            <p className="text-sm text-danger font-mono text-left">{error.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
