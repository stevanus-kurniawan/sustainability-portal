'use client';

import { FileText, Calendar, Tag as TagIcon, Download } from 'lucide-react';

import { Card, CardContent, Badge } from '@/components/ui';
import type { Document } from '@/lib/api';

interface PoliciesClientProps {
  policies: Document[];
}

export function PoliciesClient({ policies }: PoliciesClientProps) {
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
        <PolicyCard key={policy.id} policy={policy} formatDate={formatDate} />
      ))}
    </div>
  );
}

function PolicyCard({
  policy,
  formatDate,
}: {
  policy: Document;
  formatDate: (date: string) => string;
}) {
  const fileUrl = policy.attributes.currentVersion?.data?.attributes?.file?.data?.attributes?.url;
  const externalLink = policy.attributes.externalLink ?? null;

  return (
    <Card hover>
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
            {externalLink && (
              <a
                href={externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-primary hover:underline"
              >
                Learn more →
              </a>
            )}
          </div>
          {fileUrl && (
            <a
              href={fileUrl}
              download={policy.attributes.currentVersion?.data?.attributes?.file?.data?.attributes?.name}
              className="p-2 rounded-md hover:bg-light transition-colors text-steel hover:text-charcoal flex-shrink-0"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
