import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SLMS',
  description: 'Sustainability Certification and Licensing Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
