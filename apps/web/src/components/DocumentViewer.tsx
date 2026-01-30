'use client';

import { X, Download, ExternalLink, FileText } from 'lucide-react';
import { useEffect, useCallback } from 'react';

import type { Document } from '@/lib/api';

import { Badge } from './ui/Badge';

interface DocumentViewerProps {
  doc: Document | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentViewer({ doc, isOpen, onClose }: DocumentViewerProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen || !doc) return null;

  const fileData = doc.attributes.currentVersion?.data?.attributes?.file?.data?.attributes;
  const fileUrl = fileData?.url;
  const mimeType = fileData?.mime || '';
  const fileName = fileData?.name || 'document';
  const fileSize = fileData?.size || 0;
  const isPDF = mimeType === 'application/pdf';
  const isImage = mimeType.startsWith('image/');

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-charcoal/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl max-h-[90vh] mx-4 bg-surface rounded-lg shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-start justify-between p-4 border-b border-border-light bg-lighter">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="font-heading text-xl font-bold text-charcoal truncate">{doc.attributes.title}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="info">{doc.attributes.type}</Badge>
              {doc.attributes.category?.data && (
                <Badge variant="outline">{doc.attributes.category.data.attributes.name}</Badge>
              )}
              {doc.attributes.tags?.data?.map((tag) => (
                <Badge key={tag.id} variant="default">{tag.attributes.name}</Badge>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-light transition-colors" aria-label="Close">
            <X className="h-5 w-5 text-steel" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {fileUrl ? (
            <div className="h-full min-h-[500px]">
              {isPDF ? (
                <iframe src={`${fileUrl}#toolbar=1&navpanes=0`} className="w-full h-full min-h-[500px]" title={doc.attributes.title} />
              ) : isImage ? (
                <div className="flex items-center justify-center p-8 bg-charcoal/5">
                  <img src={fileUrl} alt={doc.attributes.title} className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
                  <FileText className="h-16 w-16 text-border-medium mb-4" />
                  <p className="text-charcoal font-medium mb-2">Preview not available</p>
                  <p className="text-sm text-steel mb-4">{fileName} ({mimeType})</p>
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
              <FileText className="h-16 w-16 text-border-medium mb-4" />
              <p className="text-charcoal font-medium">No file attached</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border-light bg-lighter">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-steel">
              {doc.attributes.publishedAt && <span>Published: {formatDate(doc.attributes.publishedAt)}</span>}
              {fileSize > 0 && <span>Size: {formatFileSize(fileSize)}</span>}
              {doc.attributes.currentVersion?.data?.attributes?.versionNo && (
                <span>Version {doc.attributes.currentVersion.data.attributes.versionNo}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {fileUrl && (
                <>
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn-outline text-sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in New Tab
                  </a>
                  <a href={fileUrl} download={fileName} className="btn-primary text-sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </>
              )}
            </div>
          </div>
          {doc.attributes.description && (
            <div className="mt-4 pt-4 border-t border-border-light">
              <p className="text-sm text-steel">{doc.attributes.description.replace(/<[^>]*>/g, '')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
