'use client';

import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
  fontSize: '1rem',
  textDecoration: 'none',
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
};

export default function NotFound() {
  return (
    <div style={containerStyle}>
      <div style={centerStyle}>
        <div style={iconWrapStyle}>
          <FileQuestion style={{ width: 40, height: 40, color: '#C43A31' }} />
        </div>
        <h1 style={titleStyle}>Page Not Found</h1>
        <p style={textStyle}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div style={btnWrapStyle}>
          <Link href="/" style={primaryBtnStyle}>
            <Home style={{ width: 20, height: 20, marginRight: 8 }} />
            Back to Home
          </Link>
          <button type="button" onClick={() => window.history.back()} style={outlineBtnStyle}>
            <ArrowLeft style={{ width: 20, height: 20, marginRight: 8 }} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
