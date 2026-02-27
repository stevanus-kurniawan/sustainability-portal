'use client';

import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

const containerStyle: React.CSSProperties = {
  minHeight: '60vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4rem 1rem',
};
const centerStyle: React.CSSProperties = { textAlign: 'center' };
const iconWrapStyle: React.CSSProperties = {
  width: 80,
  height: 80,
  borderRadius: '50%',
  background: 'rgba(196, 58, 49, 0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 1.5rem',
};
const titleStyle: React.CSSProperties = { fontSize: '1.5rem', marginBottom: '1rem', color: '#2B2B2B' };
const textStyle: React.CSSProperties = { color: '#6B6B6B', marginBottom: '2rem', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' };
const btnWrapStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' };
const primaryBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.75rem 1.5rem',
  background: '#C43A31',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: '1rem',
};
const outlineBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.75rem 1.5rem',
  background: 'transparent',
  color: '#2B2B2B',
  border: '1px solid #C4C4C4',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: '1rem',
  textDecoration: 'none',
};

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div style={containerStyle}>
      <div style={centerStyle}>
        <div style={iconWrapStyle}>
          <AlertTriangle style={{ width: 40, height: 40, color: '#C43A31' }} />
        </div>
        <h1 style={titleStyle}>Something Went Wrong</h1>
        <p style={textStyle}>
          We encountered an unexpected error. Please try again or return to the homepage.
        </p>
        <div style={btnWrapStyle}>
          <button type="button" onClick={reset} style={primaryBtnStyle}>
            <RefreshCw style={{ width: 20, height: 20, marginRight: 8 }} />
            Try Again
          </button>
          <Link href="/" style={outlineBtnStyle}>
            <Home style={{ width: 20, height: 20, marginRight: 8 }} />
            Back to Home
          </Link>
        </div>
        {typeof process !== 'undefined' && process.env.NODE_ENV === 'development' && error?.message && (
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(196,58,49,0.05)', borderRadius: 8, maxWidth: 560, margin: '2rem auto 0' }}>
            <p style={{ fontSize: '0.875rem', color: '#C43A31', fontFamily: 'monospace', textAlign: 'left' }}>{error.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
