import { ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui';
import { getProcedures } from '@/lib/api';

export const metadata = {
  title: 'Sustainability Procedures',
  description: 'Sustainability procedure records',
};
export const dynamic = 'force-dynamic';

export default async function SustainabilityProceduresPage() {
  const { data } = await getProcedures({ pageSize: 100, procedureScope: 'SUSTAINABILITY' });
  return (
    <div>
      <PageHeader title="Procedure — Sustainability" description="Access sustainability procedure records." />
      <section className="py-12">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 lg:px-8">
          {(data ?? []).map((doc) => {
            const file = doc.attributes.currentVersion?.data?.attributes?.file?.data?.attributes;
            return (
              <Card key={doc.id} hover>
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-success/10 text-success">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-heading text-lg font-semibold text-charcoal">{doc.attributes.title}</h2>
                    {doc.attributes.description && <p className="mt-1 text-sm text-steel">{doc.attributes.description}</p>}
                    {file?.url && <a href={file.url} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">Open document</a>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {(data ?? []).length === 0 && <p className="text-steel">No sustainability procedures available.</p>}
        </div>
      </section>
    </div>
  );
}
