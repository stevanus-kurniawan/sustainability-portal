'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, FileText, FolderOpen, Leaf, LogOut, Scale, Award, AlertCircle, FolderTree } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { adminLogout } from '@/lib/auth-api';
import { useState } from 'react';

const adminNav: { name: string; href: string; icon?: React.ReactNode; children?: { name: string; href: string }[] }[] = [
  { name: 'Policies', href: '/admin/policies', icon: <FileText className="h-4 w-4" /> },
  {
    name: 'Procedure',
    href: '/admin/procedure/sop',
    icon: <FolderOpen className="h-4 w-4" />,
    children: [
      { name: 'SOP', href: '/admin/procedure/sop' },
      { name: 'Form', href: '/admin/procedure/forms' },
    ],
  },
  {
    name: 'Sustainability',
    href: '/admin/sustainability/reports',
    icon: <Leaf className="h-4 w-4" />,
    children: [
      { name: 'Sustainability Report', href: '/admin/sustainability/reports' },
      { name: 'Certificate', href: '/admin/sustainability/certificates' },
    ],
  },
  {
    name: 'Compliance',
    href: '/admin/compliance/national',
    icon: <Scale className="h-4 w-4" />,
    children: [
      { name: 'National', href: '/admin/compliance/national' },
      { name: 'International', href: '/admin/compliance/international' },
      { name: 'Standard', href: '/admin/compliance/standard' },
      { name: 'License', href: '/admin/compliance/licenses' },
    ],
  },
  { name: 'Grievance', href: '/admin/grievance', icon: <AlertCircle className="h-4 w-4" /> },
  { name: 'Categories', href: '/admin/categories', icon: <FolderTree className="h-4 w-4" /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    Procedure: true,
    Sustainability: true,
    Compliance: true,
  });
  const isLoginPage = pathname === '/admin/login';

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  async function handleLogout() {
    try {
      await adminLogout();
      router.push('/admin/login');
      router.refresh();
    } catch {
      router.push('/admin/login');
      router.refresh();
    }
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 border-r border-border-light bg-surface flex flex-col">
        <div className="p-4 border-b border-border-light">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-heading text-lg font-bold text-charcoal">SLMS Admin</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium',
              pathname === '/admin'
                ? 'bg-primary/10 text-primary border-l-2 border-primary'
                : 'text-steel hover:bg-light hover:text-charcoal'
            )}
          >
            Dashboard
          </Link>
          {adminNav.map((item) => {
            if (item.children?.length) {
              const isOpen = openMenus[item.name] ?? false;
              const isActive = item.children.some((c) => pathname === c.href);
              return (
                <div key={item.name} className="py-0.5">
                  <button
                    type="button"
                    onClick={() => toggleMenu(item.name)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium text-left',
                      isActive ? 'bg-primary/10 text-primary' : 'text-steel hover:bg-light hover:text-charcoal'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {item.icon}
                      {item.name}
                    </span>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                  </button>
                  {isOpen &&
                    item.children?.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-2 py-2 pl-10 pr-4 text-sm',
                          pathname === child.href
                            ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary'
                            : 'text-steel hover:bg-light hover:text-charcoal'
                        )}
                      >
                        {child.name}
                      </Link>
                    ))}
                </div>
              );
            }
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium',
                  isActive ? 'bg-primary/10 text-primary border-l-2 border-primary' : 'text-steel hover:bg-light hover:text-charcoal'
                )}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border-light flex flex-col gap-2">
          <Link href="/" className="text-sm text-steel hover:text-charcoal">
            Public Portal
          </Link>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 w-full justify-center">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-lighter">
        {children}
      </main>
    </div>
  );
}
