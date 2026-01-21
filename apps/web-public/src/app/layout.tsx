import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SLMS - Sustainability Portal',
    template: '%s | SLMS',
  },
  description: 'Sustainability Licensing Management System - Access certifications, licenses, policies, and compliance documentation.',
  keywords: ['sustainability', 'certifications', 'licenses', 'compliance', 'traceability', 'grievance'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
