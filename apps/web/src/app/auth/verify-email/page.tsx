'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Card, CardContent, CardHeader, CardTitle, Alert, Input } from '@/components/ui';
import { userVerifyEmail, resendUserVerification } from '@/lib/auth-api';

function VerifyEmailHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');

  useEffect(() => {
    if (!token || typeof token !== 'string') {
      setStatus('error');
      setMessage('Invalid or missing verification link.');
      return;
    }

    (async () => {
      try {
        const result = await userVerifyEmail(token.trim());
        setStatus('success');
        setMessage(result.message || 'Email verified successfully.');
        // Cookie is set by API; redirect to overview immediately (user is auto-logged in)
        router.replace('/home');
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Verification link expired or invalid.');
      }
    })();
  }, [token, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-16">
        <div className="w-full max-w-md mx-auto px-4">
          <div className="flex justify-center mb-6">
            <Image src="/logo.png" alt="Logo" width={64} height={64} className="h-16 w-16 object-contain" priority unoptimized />
          </div>
          <Card className="p-6">
            <CardContent>
              <p className="text-steel text-center">Verifying your email...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-16">
        <div className="w-full max-w-md mx-auto px-4">
          <div className="flex justify-center mb-6">
            <Image src="/logo.png" alt="Logo" width={64} height={64} className="h-16 w-16 object-contain" priority unoptimized />
          </div>
          <Card className="p-6">
            <CardHeader>
              <CardTitle>Email verified</CardTitle>
              <p className="text-sm text-steel mt-1">Redirecting to overview...</p>
            </CardHeader>
            <CardContent>
              <Alert variant="success">{message}</Alert>
              <Link href="/home" className="btn-primary mt-4 w-full inline-block text-center py-2 rounded-md no-underline">
                Go to overview
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    const email = resendEmail.trim().toLowerCase();
    if (!email) return;
    setResendLoading(true);
    setResendSuccess('');
    try {
      const result = await resendUserVerification(email);
      setResendSuccess(result.message || 'Verification link sent.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to send verification email.');
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-16">
      <div className="w-full max-w-md mx-auto px-4">
        <div className="flex justify-center mb-6">
          <Image src="/logo.png" alt="Logo" width={64} height={64} className="h-16 w-16 object-contain" priority unoptimized />
        </div>
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Verification failed</CardTitle>
            <p className="text-sm text-steel mt-1">Please request a new verification link.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="error">{message}</Alert>
            {resendSuccess && <Alert variant="success">{resendSuccess}</Alert>}
            <form onSubmit={handleResend} className="space-y-3">
              <Input
                type="email"
                placeholder="Enter your email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                required
                className="w-full"
              />
              <Button type="submit" className="w-full" isLoading={resendLoading} disabled={resendLoading}>
                Resend verification link
              </Button>
            </form>
            <p className="text-sm text-steel text-center">
              <Link href="/login" className="text-primary hover:underline font-medium">
                Back to login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-steel">Loading...</p>
        </div>
      }
    >
      <VerifyEmailHandler />
    </Suspense>
  );
}
