import { Award } from 'lucide-react';
import Link from 'next/link';

import { CertificationForm } from '../CertificationForm';

export const metadata = {
  title: 'New Certification',
  description: 'Create a new certification',
};

export default function NewCertificationPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <Link
          href="/admin/certifications"
          className="text-sm text-steel hover:text-primary hover:underline"
        >
          ← Certifications
        </Link>
        <h1 className="font-heading text-h2 text-charcoal mt-2 flex items-center gap-2">
          <Award className="h-7 w-7 text-primary" />
          New Certification
        </h1>
        <p className="mt-1 text-steel">Add a new sustainability certification.</p>
      </div>
      <CertificationForm />
    </div>
  );
}
