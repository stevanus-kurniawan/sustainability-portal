import { Suspense } from 'react';

import { PageHeader } from '@/components/PageHeader';
import { CardSkeleton } from '@/components/ui';
import { getCertifications, type Certification } from '@/lib/api';

import { CertificationsViewClient } from './CertificationsViewClient';

export const metadata = {
  title: 'Certifications',
  description: 'Sustainability certifications and standards compliance',
};
export const dynamic = 'force-dynamic';

function groupByStatus(certs: Certification[]) {
  const active = certs.filter((c) => c.attributes.status === 'ACTIVE');
  const expiring = certs.filter((c) => c.attributes.status === 'EXPIRING');
  return { active, expiring };
}

async function CertificationsList() {
  const { data: certifications } = await getCertifications({ pageSize: 50 });

  const visibleCertifications =
    certifications?.filter((c) => c.attributes.status !== 'EXPIRED') ?? [];
  const { active, expiring } = groupByStatus(visibleCertifications);
  const activeCerts = [...expiring, ...active];

  return <CertificationsViewClient certifications={activeCerts} />;
}

function CertificationsLoading() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function CertificationsPage() {
  return (
    <div>
      <PageHeader
        title="Certifications"
        description="Our sustainability certifications, environmental and social standards compliance, and third-party verifications. This page lists active and expiring certifications with issuers, certificate numbers, validity dates, and links to view or download certificates where available."
      />
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<CertificationsLoading />}>
            <CertificationsList />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
