'use client';

import { Award, Building2, FileCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useTransition } from 'react';

import { Card, CardContent, EmptyState, Pagination } from '@/components/ui';
import type { Certification } from '@/lib/api';

interface SubContentCertificationsClientProps {
  initialCertifications: Certification[];
  totalPages: number;
  currentPage: number;
  categorySlug: string;
  subSlug: string;
  categoryName: string;
  subTitle: string;
  sectionListHref: string;
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function CertificationCard({ certification }: { certification: Certification }) {
  const docData = certification.attributes?.document?.data ?? null;
  const fileUrl =
    docData?.attributes?.currentVersion?.data?.attributes?.file?.data?.attributes?.url ?? undefined;
  const externalLink = (certification.attributes as { externalLink?: string | null }).externalLink ?? null;

  return (
    <Card hover className="h-full">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
            <Award className="h-6 w-6 text-success" />
          </div>
        </div>
        <h3 className="font-heading text-lg font-semibold text-charcoal mb-2">
          {certification.attributes.name}
        </h3>
        <div className="space-y-2 text-sm text-steel flex-1">
          {certification.attributes.issuer && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{certification.attributes.issuer}</span>
            </div>
          )}
          {certification.attributes.certificateNo && (
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">#{certification.attributes.certificateNo}</span>
            </div>
          )}
        </div>
        {(() => {
          const hasIssued =
            certification.attributes.issuedDate &&
            !Number.isNaN(new Date(certification.attributes.issuedDate).getTime());
          const hasExpiry =
            certification.attributes.expiryDate &&
            !Number.isNaN(new Date(certification.attributes.expiryDate).getTime());
          if (!hasIssued && !hasExpiry) return null;
          return (
            <div className="mt-4 pt-4 border-t border-border-light">
              <div className="flex justify-between text-sm">
                {hasIssued && (
                  <div>
                    <span className="text-steel">Issued</span>
                    <p className="font-medium text-charcoal">
                      {formatDate(certification.attributes.issuedDate)}
                    </p>
                  </div>
                )}
                {hasExpiry && (
                  <div className={hasIssued ? 'text-right' : ''}>
                    <span className="text-steel">Expires</span>
                    <p className="font-medium text-charcoal">
                      {formatDate(certification.attributes.expiryDate)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        {(fileUrl || externalLink) && (
          <div className="mt-4 space-y-2">
            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline text-sm w-full justify-center"
              >
                View Certificate
              </a>
            )}
            {externalLink && (
              <a
                href={externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-primary hover:underline text-center"
              >
                Learn more →
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SubContentCertificationsClient({
  initialCertifications,
  totalPages,
  currentPage,
  categorySlug,
  subSlug,
  categoryName,
  subTitle,
  sectionListHref,
}: SubContentCertificationsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const onPageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page <= 1) params.delete('page');
      else params.set('page', String(page));
      startTransition(() => router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`));
    },
    [pathname, router, searchParams],
  );

  return (
    <>
      <nav className="text-sm text-steel mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-charcoal">
          Portal
        </Link>
        <span>/</span>
        <Link href={sectionListHref} className="hover:text-charcoal">
          {categoryName}
        </Link>
        <span>/</span>
        <span className="text-charcoal font-medium">{subTitle}</span>
      </nav>

      <section className={isPending ? 'opacity-50' : ''}>
        {initialCertifications.length === 0 ? (
          <EmptyState
            type="no-data"
            title="No certifications yet"
            description="Certifications for this sub-content will appear here once they are added."
          />
        ) : (
          <>
            <p className="text-sm text-steel mb-6">
              Showing {initialCertifications.length} certification{initialCertifications.length !== 1 && 's'}
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {initialCertifications.map((cert) => (
                <CertificationCard key={cert.id} certification={cert} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={onPageChange}
                />
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
