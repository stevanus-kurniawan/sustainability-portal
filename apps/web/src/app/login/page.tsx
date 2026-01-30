'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Leaf } from 'lucide-react';
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await userLogin(email.trim(), password);
      router.push('/home');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-16">
      <div className="w-full max-w-md mx-auto px-4">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-lg bg-primary flex items-center justify-center">
            <Leaf className="h-8 w-8 text-primary-foreground" />
          </div>
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
                <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full" />
              </div>
              <Button type="submit" className="w-full" isLoading={loading} disabled={loading}>Login</Button>
            </form>
            <p className="mt-4 text-sm text-steel text-center">
              Don&apos;t have an account? <Link href="/register" className="text-primary hover:underline font-medium">Create account</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
