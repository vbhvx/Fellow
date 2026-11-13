'use client';

// Last resort, for errors in the root layout itself: it replaces the layout, so it brings its own
// <html> and inline styles (globals.css may be what failed).
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#f8fafc', color: '#0f172a', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 18 }}>Fellow could not load</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>An unexpected error stopped the app from starting.</p>
          {error.digest && <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8' }}>Reference: {error.digest}</p>}
          <button onClick={reset} style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, border: 0, background: '#4f46e5', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
