import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, EmptyState } from '@/components/ui';
import type { SubContent } from '@/lib/api';
import Link from 'next/link';
import { Layers, ClipboardList, FileBarChart, type LucideIcon } from 'lucide-react';

function getSubContentIcon(slug: string): LucideIcon {
  if (slug === 'sop') return ClipboardList;
  if (slug === 'sustainability-report') return FileBarChart;
  return Layers;
}

interface SectionSubContentListProps {
  sectionName: string;
  sectionPath: string;
  subContents: SubContent[];
  /** Override default description (e.g. from section config). */
  description?: string;
  /** Optional banner image path (e.g. /banners/section.jpg). */
  bannerImage?: string;
}

export function SectionSubContentList({
  sectionName,
  sectionPath,
  subContents,
  description,
  bannerImage,
}: SectionSubContentListProps) {
  return (
    <div>
      <PageHeader
        title={sectionName}
        description={description ?? 'Select a sub-content to view its documents and links.'}
        bannerImage={bannerImage}
      />
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {subContents.length === 0 ? (
            <EmptyState
              type="no-data"
              title="No sub-contents yet"
              description="Sub-contents (e.g. sites) will appear here once they are added."
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {subContents.map((sub) => {
                const SubIcon = getSubContentIcon(sub.attributes.slug);
                return (
                <Link
                  key={sub.id}
                  href={`/${sectionPath}/${encodeURIComponent(sub.attributes.slug)}`}
                  className="block"
                >
                  <Card hover className="h-full">
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                        <SubIcon className="h-6 w-6 text-primary" />
                      </div>
                      <h2 className="font-heading text-lg font-semibold text-charcoal mb-2">
                        {sub.attributes.title}
                      </h2>
                      {sub.attributes.description && (
                        <p className="text-sm text-steel line-clamp-2 flex-1">
                          {sub.attributes.description}
                        </p>
                      )}
                      <span className="text-sm text-primary font-medium mt-2 inline-flex items-center">
                        View documents →
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );})}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
