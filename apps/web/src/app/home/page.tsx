import Link from 'next/link';
import { Leaf, FileText, Award, Library } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

export const metadata = {
  title: 'Home',
  description: 'Your SLMS dashboard',
};

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="font-heading text-h1 text-charcoal mb-2">Welcome</h1>
        <p className="text-steel">Access your sustainability portal resources.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/library">
          <Card hover className="h-full">
            <CardContent className="p-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <Library className="h-6 w-6" />
              </div>
              <h2 className="font-heading text-lg font-semibold text-charcoal mb-2">Library</h2>
              <p className="text-sm text-steel">Browse and download documents.</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/sustainability/certificate">
          <Card hover className="h-full">
            <CardContent className="p-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-success/10 text-success mb-4">
                <Award className="h-6 w-6" />
              </div>
              <h2 className="font-heading text-lg font-semibold text-charcoal mb-2">Certifications</h2>
              <p className="text-sm text-steel">View certifications and compliance.</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/policies">
          <Card hover className="h-full">
            <CardContent className="p-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10 text-warning mb-4">
                <FileText className="h-6 w-6" />
              </div>
              <h2 className="font-heading text-lg font-semibold text-charcoal mb-2">Policies</h2>
              <p className="text-sm text-steel">Corporate sustainability policies.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
