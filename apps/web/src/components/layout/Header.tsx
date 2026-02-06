'use client';

import { Menu, X, LogOut, User, ChevronDown, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';
import { userMe, userLogout } from '@/lib/auth-api';
import type { UserMeResponse } from '@/lib/auth-api';

export type NavItemLink = { label: string; href: string };
export type NavItemWithChildren = { label: string; children: NavItemLink[] };
export type NavItem = NavItemLink | NavItemWithChildren;

function isNavItemWithChildren(item: NavItem): item is NavItemWithChildren {
  return 'children' in item && Array.isArray((item as NavItemWithChildren).children);
}

function isHrefActive(href: string, pathname: string, searchParams: URLSearchParams): boolean {
  if (href === '/') return pathname === '/';
  if (href.startsWith('/library')) {
    const u = new URL(href, 'http://_');
    const cat = u.searchParams.get('category');
    const currentCat = searchParams.get('category');
    return pathname === '/library' && currentCat === cat;
  }
  return pathname === href || (href !== '/' && pathname.startsWith(href));
}

export function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [navigation, setNavigation] = useState<NavItem[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [user, setUser] = useState<UserMeResponse | null | undefined>(undefined);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/public/navigation', { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : { items: [] })
      .then((data) => setNavigation(data?.items ?? []))
      .catch(() => setNavigation([]));
  }, []);

  useEffect(() => {
    userMe().then(setUser).catch(() => setUser(null));
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
      if (navRef.current && !navRef.current.contains(target)) {
        setDropdownOpen(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleUserLogout() {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    try {
      await userLogout();
      setUser(null);
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
      router.refresh();
    }
  }

  const linkClass = (active: boolean) =>
    cn(
      'px-3 py-2 text-sm font-medium rounded-md transition-colors',
      active ? 'bg-primary/10 text-primary' : 'text-steel hover:text-charcoal hover:bg-light'
    );
  const mobileLinkClass = (active: boolean) =>
    cn(
      'block px-3 py-2 text-base font-medium rounded-md',
      active ? 'bg-primary/10 text-primary' : 'text-steel hover:text-charcoal hover:bg-light'
    );

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border-light shadow-sm">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg transition-transform group-hover:scale-105">
                <Image
                  src="/logo.png"
                  alt="Sustainability portal logo"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                  unoptimized
                />
              </div>
              <div className="hidden sm:block">
                <span className="font-heading text-lg font-bold text-charcoal">SLMS</span>
                <span className="block text-xs text-steel -mt-1">Sustainability Portal</span>
              </div>
            </Link>
          </div>

          <div ref={navRef} className="hidden lg:flex lg:items-center lg:gap-1">
            {navigation.map((item) => {
              if (isNavItemWithChildren(item)) {
                const isOpen = dropdownOpen === item.label;
                const hasActiveChild = item.children.some((c) => isHrefActive(c.href, pathname, searchParams));
                return (
                  <div key={item.label} className="relative">
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(isOpen ? null : item.label)}
                      className={cn(
                        'inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                        hasActiveChild ? 'bg-primary/10 text-primary' : 'text-steel hover:text-charcoal hover:bg-light'
                      )}
                      aria-expanded={isOpen}
                      aria-haspopup="true"
                    >
                      {item.label}
                      <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                    </button>
                    {isOpen && (
                      <div className="absolute left-0 top-full z-[100] mt-0.5 min-w-[10rem] rounded-md border border-border-light bg-white py-1 shadow-lg">
                        {item.children.length === 0 ? (
                          <div className="px-4 py-2 text-sm text-steel">No items</div>
                        ) : (
                          item.children.map((child) => {
                            const active = isHrefActive(child.href, pathname, searchParams);
                            return (
                              <Link
                                key={child.href + child.label}
                                href={child.href}
                                className={cn(
                                  'block px-4 py-2 text-sm text-charcoal',
                                  active ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-light hover:text-charcoal'
                                )}
                                onClick={() => setDropdownOpen(null)}
                              >
                                {child.label}
                              </Link>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              }
              const isActive = isHrefActive(item.href, pathname, searchParams);
              return (
                <Link key={item.label} href={item.href} className={linkClass(isActive)}>
                  {item.label}
                </Link>
              );
            })}
            {user && (
              <div className="relative ml-2" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-steel hover:text-charcoal hover:bg-light border border-border-light transition-colors"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </span>
                  <span className="max-w-[120px] truncate">{user.name}</span>
                  <ChevronDown className={cn('h-4 w-4 transition-transform', userMenuOpen && 'rotate-180')} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-1 w-48 rounded-md border border-border-light bg-surface py-1 shadow-lg">
                    <Link
                      href="/home"
                      className="block px-4 py-2 text-sm text-charcoal hover:bg-light"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      My Profile
                    </Link>
                    <button
                      type="button"
                      onClick={handleUserLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-charcoal hover:bg-light"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex lg:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-steel hover:bg-light hover:text-charcoal"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden pb-4">
            <div className="space-y-1 pt-2">
              {navigation.map((item) => {
                if (isNavItemWithChildren(item)) {
                  const isExpanded = mobileExpanded === item.label;
                  return (
                    <div key={item.label}>
                      <button
                        type="button"
                        onClick={() => setMobileExpanded(isExpanded ? null : item.label)}
                        className="flex w-full items-center justify-between px-3 py-2 text-base font-medium rounded-md text-steel hover:text-charcoal hover:bg-light"
                      >
                        {item.label}
                        <ChevronRight className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')} />
                      </button>
                      {isExpanded && (
                        <div className="ml-4 mt-1 space-y-1 border-l border-border-light pl-3">
                          {item.children.map((child) => {
                            const active = isHrefActive(child.href, pathname, searchParams);
                            return (
                              <Link
                                key={child.href + child.label}
                                href={child.href}
                                className={mobileLinkClass(active)}
                                onClick={() => setMobileMenuOpen(false)}
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }
                const isActive = isHrefActive(item.href, pathname, searchParams);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={mobileLinkClass(isActive)}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
              {user && (
                <>
                  <Link
                    href="/home"
                    className="block px-3 py-2 text-base font-medium rounded-md text-steel hover:text-charcoal hover:bg-light"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Profile
                  </Link>
                  <button
                    type="button"
                    className="block w-full text-left px-3 py-2 text-base font-medium rounded-md text-steel hover:text-charcoal hover:bg-light"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleUserLogout();
                    }}
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
