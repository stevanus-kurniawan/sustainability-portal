'use client';

import { MessageSquareWarning, Calendar, Tag as TagIcon, Download } from 'lucide-react';

import { Card, CardContent, Badge } from '@/components/ui';
import type { Document } from '@/lib/api';

interface GrievanceDocumentsClientProps {
  documents: Document[];
}

export function GrievanceDocumentsClient({ documents }: GrievanceDocumentsClientProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="grid gap-6">
      {documents.map((doc: Document) => (
        <GrievanceDocumentCard key={doc.id} document={doc} formatDate={formatDate} />
      ))}
    </div>
  );
}

function GrievanceDocumentCard({
  document: doc,
  formatDate,
}: {
  document: Document;
  formatDate: (date: string) => string;
}) {
  const fileUrl = doc.attributes.currentVersion?.data?.attributes?.file?.data?.attributes?.url;
  const externalLink = doc.attributes.externalLink ?? null;

  return (
    <Card hover>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquareWarning className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-lg font-semibold text-charcoal mb-2">
              {doc.attributes.title}
            </h3>
            {doc.attributes.description && (
              <p className="text-sm text-steel mb-4 line-clamp-2">
                {doc.attributes.description.replace(/<[^>]*>/g, '')}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-steel">
              {doc.attributes.publishedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(doc.attributes.publishedAt)}
                </span>
              )}
              {doc.attributes.category?.data && (
                <Badge variant="outline">{doc.attributes.category.data.attributes.name}</Badge>
              )}
              {doc.attributes.tags?.data?.slice(0, 3).map((tag) => (
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
              download={doc.attributes.currentVersion?.data?.attributes?.file?.data?.attributes?.name}
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
