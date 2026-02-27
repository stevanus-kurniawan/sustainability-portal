'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from '@/components/ui';
import { userResetPassword } from '@/lib/auth-api';
import { VALIDATION } from '@slms/shared';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isInvalidToken = !token || token.length < 32;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < VALIDATION.PASSWORD.MIN_LENGTH) {
      setError(`Password must be at least ${VALIDATION.PASSWORD.MIN_LENGTH} characters`);
      return;
    }
    if (!VALIDATION.PASSWORD.PATTERN.test(newPassword)) {
      setError(
        'Password must include uppercase, lowercase, number, and special character (@$!%*?&)',
      );
      return;
    }
    setLoading(true);
    try {
      await userResetPassword({ token, newPassword });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  if (isInvalidToken) {
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
              <CardTitle>Invalid or expired link</CardTitle>
              <p className="text-sm text-steel mt-1">
                This reset link is invalid or has expired. Please request a new one.
              </p>
            </CardHeader>
            <CardContent>
              <Link href="/forgot-password" className="block">
                <Button variant="outline" type="button" className="w-full">
                  Request new link
                </Button>
              </Link>
              <p className="mt-4 text-sm text-steel text-center">
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

  if (success) {
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
              <CardTitle>Password reset</CardTitle>
              <p className="text-sm text-steel mt-1">Your password has been reset. Redirecting to login...</p>
            </CardHeader>
            <CardContent>
              <Alert variant="success">You can now sign in with your new password.</Alert>
              <Link href="/login" className="block mt-4">
                <Button type="button" className="w-full">
                  Go to login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
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
            <CardTitle>Set new password</CardTitle>
            <p className="text-sm text-steel mt-1">
              Enter your new password. At least 10 characters including uppercase, lowercase, number,
              and special character (@$!%*?&).
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <Alert variant="error">{error}</Alert>}
              <div>
                <label htmlFor="newPassword" className="label block mb-2 text-charcoal">
                  New password
                </label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={VALIDATION.PASSWORD.MIN_LENGTH}
                    placeholder="NewStr0ngP@ss!"
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-steel hover:text-charcoal"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="label block mb-2 text-charcoal">
                  Confirm password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={VALIDATION.PASSWORD.MIN_LENGTH}
                  placeholder="Confirm new password"
                  className="w-full"
                />
              </div>
              <Button type="submit" className="w-full" isLoading={loading} disabled={loading}>
                Reset password
              </Button>
            </form>
            <p className="mt-4 text-sm text-steel text-center">
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-steel">Loading...</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
