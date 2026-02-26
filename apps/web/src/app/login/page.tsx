'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from '@/components/ui';
import { userLogin } from '@/lib/auth-api';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showPleaseLogin = searchParams.get('message') === 'please-login';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await userLogin(email.trim(), password);
      router.push('/');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
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
            <p className="text-sm text-steel mt-1">Enter your email and password.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {showPleaseLogin && (
                <Alert variant="info">Please login to continue.</Alert>
              )}
              {error && <Alert variant="error">{error}</Alert>}
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
