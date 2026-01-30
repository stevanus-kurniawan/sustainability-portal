'use client';

import { Award } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { CertificationForm, type CertificationFormData } from '../CertificationForm';

interface CertificationResponse {
  id: number;
  attributes: {
    name: string;
    issuer: string | null;
    certificateNo: string | null;
    issuedDate: string | null;
    expiryDate: string | null;
    document?: { data: { id: number } | null };
  };
}

export default function EditCertificationPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? parseInt(params.id, 10) : NaN;
  const [cert, setCert] = useState<CertificationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Number.isNaN(id)) {
      setError('Invalid ID');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/certifications/${id}`, { credentials: 'include' });
        if (res.status === 401) {
          router.replace('/admin/login');
          return;
        }
        if (!res.ok) {
          setError('Failed to load certification');
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setCert(data);
        }
      } catch {
        if (!cancelled) setError('Failed to load certification');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const initialData: CertificationFormData | undefined = cert
    ? {
        name: cert.attributes.name,
        issuer: cert.attributes.issuer ?? '',
        certificateNo: cert.attributes.certificateNo ?? '',
        issuedDate: cert.attributes.issuedDate ?? '',
        expiryDate: cert.attributes.expiryDate ?? '',
        documentId: cert.attributes.document?.data?.id ?? null,
        externalLink: (cert.attributes as { externalLink?: string | null }).externalLink ?? '',
      }
    : undefined;

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="text-steel">Loading…</div>
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-danger">{error || 'Certification not found.'}</p>
        <Link href="/admin/certifications" className="mt-4 inline-block text-primary hover:underline">
          ← Back to Certifications
        </Link>
      </div>
    );
  }

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
          Edit Certification
        </h1>
        <p className="mt-1 text-steel">Update certification details.</p>
      </div>
      <CertificationForm initialData={initialData} id={id} />
    </div>
  );
}
