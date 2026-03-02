import type { Metadata } from 'next';

import { ConditionalLayout } from '@/components/layout/ConditionalLayout';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SLMS - Sustainability Portal',
    template: '%s | SLMS',
  },
  description: 'Sustainability Licensing Management System - Access certifications, licenses, policies, and compliance documentation.',
  keywords: ['sustainability', 'certifications', 'licenses', 'compliance', 'traceability', 'grievance'],
  icons: {
    icon: [
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  );
}
