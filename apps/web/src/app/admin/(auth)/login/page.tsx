'use client';

import { FormEvent, useState } from 'react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.message || 'Login failed');
      setLoading(false);
      return;
    }

    window.location.href = '/admin/dashboard';
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-light">
      <div className="w-full max-w-md bg-surface shadow-md rounded-lg p-8">
        <h1 className="text-h2 font-heading mb-2 text-charcoal">Admin Login</h1>
        <p className="text-sm text-steel mb-6">
          Sign in with your SLMS admin credentials.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full border border-border-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              className="w-full border border-border-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-primary text-white py-2 rounded-md text-sm font-medium hover:bg-primary-hover disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
