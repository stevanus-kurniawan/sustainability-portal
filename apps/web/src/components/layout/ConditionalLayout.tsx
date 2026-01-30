'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Footer } from './Footer';

const NO_HEADER_ROUTES = ['/login', '/register'];

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const isAuthPage = NO_HEADER_ROUTES.some((r) => pathname === r || pathname?.startsWith(r + '/'));

  if (isAdmin || isAuthPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
