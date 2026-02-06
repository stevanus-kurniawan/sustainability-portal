'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from '@/components/ui';
import { userRegister } from '@/lib/auth-api';

const ALLOWED_DOMAIN = '@energi-up.com';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailValid = email.trim().toLowerCase().endsWith(ALLOWED_DOMAIN);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const strongPasswordPattern =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/;
  const isStrongPassword = strongPasswordPattern.test(password);

  const passwordInlineError =
    password.length > 0 && !isStrongPassword
      ? 'Password must be at least 10 characters and include uppercase, lowercase, number, and special character.'
      : '';
  const canSubmit =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 10 &&
    confirmPassword.length >= 10 &&
    emailValid &&
    passwordsMatch &&
    isStrongPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!emailValid) {
      setError('Only @energi-up.com email addresses are allowed to register.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 10) {
      setError('Password must be at least 10 characters.');
      return;
    }
    if (!isStrongPassword) {
      setError(
        'Password must include uppercase, lowercase, number, and special character.',
      );
      return;
    }
    setLoading(true);
    try {
      const result = await userRegister({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      // Redirect to "check your email" page with email in query
      const normalizedEmail = email.trim().toLowerCase();
      router.push(`/register/verify-email?email=${encodeURIComponent(normalizedEmail)}&message=${encodeURIComponent(result.message || 'Verification email sent. Link expires in 15 minutes.')}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
            <CardTitle>Create account</CardTitle>
            <p className="text-sm text-steel mt-1">Registration is restricted to {ALLOWED_DOMAIN} email addresses.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <Alert variant="error">{error}</Alert>}
              {!emailValid && email.length > 0 && <Alert variant="warning">Only @energi-up.com email addresses are allowed to register.</Alert>}
              <div>
                <label htmlFor="fullName" className="label block mb-2 text-charcoal">Full name</label>
                <Input id="fullName" type="text" autoComplete="name" placeholder="Jane Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full" />
              </div>
              <div>
                <label htmlFor="email" className="label block mb-2 text-charcoal">Email</label>
                <Input id="email" type="email" autoComplete="email" placeholder={"you" + ALLOWED_DOMAIN} value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full" />
              </div>
              <div>
                <label htmlFor="password" className="label block mb-2 text-charcoal">Password</label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="At least 10 characters, with uppercase, lowercase, number, and special character"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={10}
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
                <p className="text-xs text-steel mt-1">
                  Minimum 10 characters, including at least 1 uppercase, 1 lowercase, 1 number, and 1 special character.
                </p>
                {passwordInlineError && (
                  <p className="text-xs text-danger mt-1">{passwordInlineError}</p>
                )}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="label block mb-2 text-charcoal">Confirm password</label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={10}
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-steel hover:text-charcoal"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && <p className="text-xs text-danger mt-1">Passwords do not match</p>}
              </div>
              <Button type="submit" className="w-full" isLoading={loading} disabled={!canSubmit || loading}>Create account</Button>
            </form>
            <p className="mt-4 text-sm text-steel text-center">
              Already have an account? <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
