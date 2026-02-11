'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Footer } from './Footer';

const NO_HEADER_ROUTES = ['/login', '/register'];

function HeaderPlaceholder() {
  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border-light shadow-sm h-16" aria-hidden />
  );
}

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const isAuthPage = NO_HEADER_ROUTES.some((r) => pathname === r || pathname?.startsWith(r + '/'));

  if (isAdmin || isAuthPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Suspense fallback={<HeaderPlaceholder />}>
        <Header />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
