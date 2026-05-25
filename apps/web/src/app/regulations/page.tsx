import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui';
import { getRegulations } from '@/lib/api';

export const metadata = {
  title: 'Regulations',
  description: 'National and international regulatory documents',
};
export const dynamic = 'force-dynamic';

export default async function RegulationsPage() {
  const { data } = await getRegulations({ pageSize: 100 });
  return (
    <div>
      <PageHeader title="Regulations" description="Browse National and International regulatory records." />
      <section className="py-12">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 lg:px-8">
          {(data ?? []).map((doc) => {
            const file = doc.attributes.currentVersion?.data?.attributes?.file?.data?.attributes;
            return (
              <Card key={doc.id} hover>
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {doc.attributes.regulationKind ?? 'REGULATION'}
                    </p>
                    <h2 className="font-heading text-lg font-semibold text-charcoal">{doc.attributes.title}</h2>
                    {doc.attributes.description && <p className="mt-1 text-sm text-steel">{doc.attributes.description}</p>}
                    {file?.url && <a href={file.url} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">Open document</a>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {(data ?? []).length === 0 && <p className="text-steel">No regulations available.</p>}
        </div>
      </section>
    </div>
  );
}
