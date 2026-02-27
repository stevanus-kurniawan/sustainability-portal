'use client';

import { useSearchParams } from 'next/navigation';
import { DocumentForm } from '../../components/DocumentForm';

export default function AdminDocumentsNewPage() {
  const searchParams = useSearchParams();
  const categoryIdStr = searchParams.get('categoryId');
  const subContentId = searchParams.get('subContentId');
  const categoryId = categoryIdStr ? parseInt(categoryIdStr, 10) : undefined;
  const backHref =
    categoryIdStr && subContentId
      ? `/admin/documents?categoryId=${categoryIdStr}&subContentId=${subContentId}`
      : '/admin/documents';

  return (
    <DocumentForm
      type="GENERAL"
      categoryId={typeof categoryId === 'number' && !Number.isNaN(categoryId) ? categoryId : undefined}
      backHref={backHref}
      title="New Document"
    />
  );
}
