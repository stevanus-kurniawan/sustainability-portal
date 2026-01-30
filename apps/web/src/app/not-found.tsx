'use client';

import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center py-16">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <FileQuestion className="h-10 w-10 text-primary" />
          </div>
        </div>
        <h1 className="font-heading text-h1 text-charcoal mb-4">Page Not Found</h1>
        <p className="text-lg text-steel mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/" className="btn-primary px-6 py-3">
            <Home className="mr-2 h-5 w-5" />
            Back to Home
          </Link>
          <button onClick={() => window.history.back()} className="btn-outline px-6 py-3">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
