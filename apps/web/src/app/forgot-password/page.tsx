'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from '@/components/ui';
import { userForgotPassword } from '@/lib/auth-api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSent(false);
    try {
      await userForgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link');
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
            <CardTitle>Forgot password</CardTitle>
            <p className="text-sm text-steel mt-1">
              {sent
                ? 'If an account exists with this email, a reset link has been sent. Check your inbox and spam folder.'
                : 'Enter your email and we will send you a link to reset your password.'}
            </p>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <Alert variant="success">
                  Check your email for the reset link. It expires in 1 hour.
                </Alert>
                <Link href="/login" className="block">
                  <Button variant="outline" type="button" className="w-full">
                    Back to login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <Alert variant="error">{error}</Alert>}
                <div>
                  <label htmlFor="email" className="label block mb-2 text-charcoal">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@energi-up.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
                <Button type="submit" className="w-full" isLoading={loading} disabled={loading}>
                  Send reset link
                </Button>
              </form>
            )}
            {!sent && (
              <p className="mt-4 text-sm text-steel text-center">
                Remember your password?{' '}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
