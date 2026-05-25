import { Award, ClipboardList, FileBadge } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui';
import { getCertifications, getLicenses, getOperationalUnits, getProcedures } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function OperationalUnitDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const units = await getOperationalUnits();
  const unit = (units.data ?? []).find((item) => item.attributes.slug === slug);
  if (!unit) notFound();

  const [procedures, certifications, licenses] = await Promise.all([
    getProcedures({ pageSize: 50, procedureScope: 'OPERATIONAL_UNIT', operationalUnitId: unit.id }),
    getCertifications({ pageSize: 50, operationalUnitId: unit.id }),
    getLicenses({ pageSize: 50, operationalUnitId: unit.id }),
  ]);

  return (
    <div>
      <PageHeader title={unit.attributes.name} description="Operational unit procedures, certificates, and licenses." />
      <section className="py-12">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:px-8">
          <UnitSection
            title="Procedures"
            icon={<ClipboardList className="h-5 w-5" />}
            items={(procedures.data ?? []).map((doc) => ({
              id: `procedure-${doc.id}`,
              title: doc.attributes.title,
              description: doc.attributes.description,
              href: doc.attributes.currentVersion?.data?.attributes?.file?.data?.attributes?.url,
            }))}
          />
          <UnitSection
            title="Certificates"
            icon={<Award className="h-5 w-5" />}
            items={(certifications.data ?? []).map((cert) => ({
              id: `cert-${cert.id}`,
              title: cert.attributes.name,
              description: cert.attributes.issuer,
              href: cert.attributes.document?.data?.attributes.currentVersion?.data?.attributes.file?.data?.attributes.url,
            }))}
          />
          <UnitSection
            title="Licenses"
            icon={<FileBadge className="h-5 w-5" />}
            items={(licenses.data ?? []).map((license) => ({
              id: `license-${license.id}`,
              title: license.attributes.name,
              description: license.attributes.authority,
              href: license.attributes.document?.data?.attributes.currentVersion?.data?.attributes.file?.data?.attributes.url,
            }))}
          />
        </div>
      </section>
    </div>
  );
}

function UnitSection({
  title,
  icon,
  items,
}: {
  title: string;
  icon: ReactNode;
  items: Array<{ id: string; title: string; description?: string | null; href?: string }>;
}) {
  return (
    <div>
      <h2 className="mb-4 font-heading text-2xl font-semibold text-charcoal">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-steel">No records available.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} hover>
              <CardContent className="p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {icon}
                </div>
                <h3 className="font-heading text-lg font-semibold text-charcoal">{item.title}</h3>
                {item.description && <p className="mt-1 text-sm text-steel">{item.description}</p>}
                {item.href && <a href={item.href} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">Open document</a>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
