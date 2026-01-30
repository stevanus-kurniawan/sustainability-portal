'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Leaf } from 'lucide-react';
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

  const emailValid = email.trim().toLowerCase().endsWith(ALLOWED_DOMAIN);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const canSubmit = fullName.trim().length > 0 && email.trim().length > 0 && password.length >= 8 && confirmPassword.length >= 8 && emailValid && passwordsMatch;

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
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await userRegister({ fullName: fullName.trim(), email: email.trim().toLowerCase(), password });
      router.push('/home');
      router.refresh();
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
          <div className="h-16 w-16 rounded-lg bg-primary flex items-center justify-center">
            <Leaf className="h-8 w-8 text-primary-foreground" />
          </div>
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
                <Input id="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="w-full" />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="label block mb-2 text-charcoal">Confirm password</label>
                <Input id="confirmPassword" type="password" autoComplete="new-password" placeholder="Repeat password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} className="w-full" />
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
