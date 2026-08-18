'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from '@/components/ui';

const ERROR_MESSAGES: Record<string, string> = {
  'invalid-credentials': 'Invalid email or password.',
  'missing-fields': 'Please enter email and password.',
  'network': 'Cannot reach the server. Please try again.',
  'invalid-request': 'Invalid request. Please try again.',
  'sso-failed': 'Sign-in with DWS Hub failed. Please try again.',
};

export default function LoginPage() {
  const searchParams = useSearchParams();
  const showPleaseLogin = searchParams.get('message') === 'please-login';
  const errorCode = searchParams.get('error') || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/auth/oidc/enabled', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { enabled: false }))
      .then((data) => {
        if (!cancelled && data?.enabled) setSsoEnabled(true);
      })
      .catch(() => {
        /* Hub SSO is optional; email/password still works */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        // Brief delay so the browser commits Set-Cookie before we navigate (fixes dev FE+BE
        // where immediate redirect can send GET / before the cookie is attached).
        await new Promise((r) => setTimeout(r, 50));
        window.location.replace('/');
        return;
      }
      setError((data?.message as string) || 'Login failed');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-16">
      <div className="w-full max-w-md mx-auto px-4">
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="Sustainability portal logo"
            width={64}
            height={64}
            className="h-16 w-16 object-contain"
            priority
            unoptimized
          />
        </div>
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <p className="text-sm text-steel mt-1">
              {ssoEnabled
                ? 'Sign in with DWS Hub or use your email and password.'
                : 'Enter your email and password.'}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {showPleaseLogin && (
                <Alert variant="info">Please login to continue.</Alert>
              )}
              {(error || errorCode) && (
                <Alert variant="error">
                  {error || ERROR_MESSAGES[errorCode] || 'Something went wrong.'}
                </Alert>
              )}
              <div>
                <label htmlFor="email" className="label block mb-2 text-charcoal">Email</label>
                <Input id="email" type="email" autoComplete="email" placeholder="you@energi-up.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full" />
              </div>
              <div>
                <label htmlFor="password" className="label block mb-2 text-charcoal">Password</label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-steel hover:text-charcoal"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" isLoading={loading} disabled={loading}>
                Login
              </Button>
            </form>
            {ssoEnabled && (
              <div className="mt-4">
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-steel">or</span>
                  </div>
                </div>
                <a
                  href="/auth/oidc/login"
                  className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-charcoal hover:bg-gray-50"
                >
                  Sign in with DWS Hub
                </a>
              </div>
            )}
            <p className="mt-3 text-sm text-steel text-center">
              <Link
                href="/forgot-password"
                className="text-primary hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </p>
            <p className="mt-4 text-sm text-steel text-center">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Create account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
