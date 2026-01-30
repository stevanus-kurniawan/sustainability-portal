import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
        <p className="text-steel">Loading...</p>
      </div>
    </div>
  );
}
