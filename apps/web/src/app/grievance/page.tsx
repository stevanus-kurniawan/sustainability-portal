import { AlertCircle } from 'lucide-react';
import { Suspense } from 'react';

import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, EmptyState, CardSkeleton } from '@/components/ui';
import { getGrievanceDocuments } from '@/lib/api';
import { GrievanceDocumentsClient } from './GrievanceDocumentsClient';

export const metadata = {
  title: 'Grievance Mechanism',
  description: 'Grievance documents and stakeholder concern resources',
};
export const dynamic = 'force-dynamic';

async function GrievanceContent() {
  let documents: Awaited<ReturnType<typeof getGrievanceDocuments>>['data'];
  try {
    const res = await getGrievanceDocuments({ pageSize: 50 });
    documents = res.data;
  } catch {
    documents = [];
  }

  if (!documents || documents.length === 0) {
    return (
      <EmptyState
        type="no-data"
        title="No grievance documents available"
        description="Grievance documents will be published here when they are available."
      />
    );
  }

  return <GrievanceDocumentsClient documents={documents} />;
}

function GrievanceLoading() {
  return (
    <div className="grid gap-6">
      {[...Array(4)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function GrievancePage() {
  return (
    <div>
      <PageHeader
        title="Grievance Mechanism"
        description="Access grievance-related documents, procedures, and resources for stakeholder concerns."
      />
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="mb-8 bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-charcoal mb-1">About Our Grievance Mechanism</h3>
                  <p className="text-sm text-steel">
                    We maintain an open grievance mechanism for stakeholders to raise concerns about our
                    sustainability practices. Documents, procedures, and resources related to grievance
                    handling are published here for transparency. Download documents below as needed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Suspense fallback={<GrievanceLoading />}>
            <GrievanceContent />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
