'use client';

import { useEffect } from 'react';

/**
 * Last-resort error boundary. This fires only when the root layout itself
 * throws, so it must render its own <html>/<body> and cannot rely on the
 * layout's stylesheet — hence inline styles. The per-route error.tsx handles
 * the common case (a single route failing) while keeping the header alive.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error boundary caught:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          background: '#0b0d10',
          color: '#e6e7e8',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '32rem',
            margin: '4rem auto',
            textAlign: 'center',
            padding: '0 1rem',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            The dashboard hit an unexpected error
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.75rem' }}>
            Reload to continue. If it persists, the underlying data service may be slow or
            unavailable.
          </p>
          {error.digest && (
            <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.5rem' }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              borderRadius: '0.375rem',
              background: '#1e293b',
              color: '#f1f5f9',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
