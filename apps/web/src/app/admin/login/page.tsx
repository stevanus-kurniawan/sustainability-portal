'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from '@/components/ui';
import { adminLogin } from '@/lib/auth-api';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminLogin(email.trim(), password);
      // Brief delay so the browser commits Set-Cookie before we navigate (same fix as visitor login).
      await new Promise((r) => setTimeout(r, 50));
      window.location.replace('/admin');
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin login failed');
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
        <h1 className="font-heading text-h2 text-charcoal text-center mb-2">Admin Portal</h1>
        <p className="text-steel text-center mb-8 text-sm">
          Sign in to manage certifications, policies, licenses, and other SLMS content.
        </p>
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Admin sign in</CardTitle>
            <p className="text-sm text-steel mt-1">Enter your admin email and password.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <Alert variant="error">{error}</Alert>}
              <div>
                <label htmlFor="admin-email" className="label block mb-2 text-charcoal">
                  Email
                </label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@energi-up.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="admin-password" className="label block mb-2 text-charcoal">
                  Password
                </label>
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full"
                />
              </div>
              <Button type="submit" className="w-full" isLoading={loading} disabled={loading}>
                Admin Login
              </Button>
            </form>
            <p className="mt-4 text-sm text-steel text-center">
              <Link href="/" className="text-primary hover:underline">
                Back to Public Portal
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
