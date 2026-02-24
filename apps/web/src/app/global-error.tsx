'use client';

/**
 * Root-level error boundary. Required by Next.js to catch errors in the root layout.
 * This component replaces the entire root layout when triggered, so it must include <html> and <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', padding: '2rem', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1a1a1a' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            We encountered an unexpected error. Please try again.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              cursor: 'pointer',
              backgroundColor: '#0d9488',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
            }}
          >
            Try again
          </button>
          <p style={{ marginTop: '1.5rem' }}>
            <a href="/" style={{ color: '#0d9488', textDecoration: 'underline' }}>
              Back to home
            </a>
          </p>
          {process.env.NODE_ENV === 'development' && error?.message && (
            <pre style={{ marginTop: '1.5rem', padding: '1rem', background: '#fef2f2', color: '#b91c1c', fontSize: '0.875rem', textAlign: 'left', overflow: 'auto' }}>
              {error.message}
            </pre>
          )}
        </div>
      </body>
    </html>
  );
}
