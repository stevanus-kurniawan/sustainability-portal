import { FileText, Calendar, Tag as TagIcon } from 'lucide-react';
import { Suspense } from 'react';

import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, Badge, EmptyState, CardSkeleton } from '@/components/ui';
import { getPolicies, type Document } from '@/lib/api';

export const metadata = {
  title: 'Policies',
  description: 'Corporate sustainability policies and commitments',
};
export const dynamic = 'force-dynamic';

async function PoliciesList() {
  const { data: policies } = await getPolicies({ pageSize: 50 });

  if (!policies || policies.length === 0) {
    return (
      <EmptyState
        type="no-data"
        title="No policies available"
        description="Policies will be published here once they are available."
      />
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="grid gap-6">
      {policies.map((policy: Document) => (
        <Card key={policy.id} hover>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading text-lg font-semibold text-charcoal mb-2">
                  {policy.attributes.title}
                </h3>
                {policy.attributes.description && (
                  <p className="text-sm text-steel mb-4 line-clamp-2">
                    {policy.attributes.description.replace(/<[^>]*>/g, '')}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-steel">
                  {policy.attributes.publishedAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(policy.attributes.publishedAt)}
                    </span>
                  )}
                  {policy.attributes.category?.data && (
                    <Badge variant="outline">{policy.attributes.category.data.attributes.name}</Badge>
                  )}
                  {policy.attributes.tags?.data?.slice(0, 3).map((tag) => (
                    <Badge key={tag.id} variant="default">
                      <TagIcon className="h-3 w-3 mr-1" />
                      {tag.attributes.name}
                    </Badge>
                  ))}
                </div>
              </div>
              {policy.attributes.currentVersion?.data?.attributes?.file?.data && (
                <a
                  href={
                    policy.attributes.currentVersion.data.attributes.file.data.attributes.url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline text-sm flex-shrink-0"
                >
                  View PDF
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PoliciesLoading() {
  return (
    <div className="grid gap-6">
      {[...Array(4)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function PoliciesPage() {
  return (
    <div>
      <PageHeader
        title="Policies"
        description="Access our corporate sustainability policies, environmental commitments, and social responsibility guidelines."
      />
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<PoliciesLoading />}>
            <PoliciesList />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
