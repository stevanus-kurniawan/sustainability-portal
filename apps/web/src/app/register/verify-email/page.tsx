'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Card, CardContent, CardHeader, CardTitle, Alert, Input } from '@/components/ui';
import { resendUserVerification, changeUserEmail } from '@/lib/auth-api';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const initialMessage =
    searchParams.get('message') || 'Verification email sent. Link expires in 15 minutes.';

  const [email, setEmail] = useState(initialEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(initialEmail);
  const [info, setInfo] = useState(initialMessage);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const result = await resendUserVerification(trimmedEmail);
      setInfo(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification email.');
    } finally {
      setLoading(false);
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');

    const current = email.trim().toLowerCase();
    const next = newEmail.trim().toLowerCase();

    if (!next) {
      setError('Please enter a new email address.');
      return;
    }

    if (current === next) {
      setError('Please enter a different email address.');
      return;
    }

    setLoading(true);
    try {
      const result = await changeUserEmail({
        currentEmail: current,
        newEmail: next,
      });
      setEmail(next);
      setIsEditingEmail(false);
      setInfo(result.message);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update email address.',
      );
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
            <CardTitle>Check your email</CardTitle>
            <p className="text-sm text-steel mt-1">
              We&apos;ve sent a verification link to your email address. The link expires in 15
              minutes.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResend} className="space-y-4">
              {info && <Alert variant="success">{info}</Alert>}
              {error && <Alert variant="error">{error}</Alert>}

              <div className="space-y-2">
                <label htmlFor="email" className="label block mb-1 text-charcoal">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  readOnly={!isEditingEmail}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setNewEmail(e.target.value);
                  }}
                  required
                  className="w-full disabled:opacity-100"
                />
                {!isEditingEmail ? (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      setIsEditingEmail(true);
                      setNewEmail(email);
                    }}
                  >
                    Change email
                  </button>
                ) : (
                  <div className="space-y-2">
                    <Input
                      id="newEmail"
                      type="email"
                      autoComplete="email"
                      placeholder="Enter new email address"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                      className="w-full mt-1"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditingEmail(false);
                          setNewEmail(email);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleChangeEmail}
                        isLoading={loading}
                        disabled={loading}
                      >
                        Save &amp; resend verification
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" isLoading={loading} disabled={loading}>
                Resend verification link
              </Button>
            </form>

            <p className="mt-4 text-sm text-steel text-center">
              Already verified?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

