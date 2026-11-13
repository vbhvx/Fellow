'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

/**
 * Catches render and effect errors in any page below the root layout. Data-loading failures are
 * handled in the pages themselves (an ErrorAlert with the API's message); this is for bugs.
 */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
        <h1 className="text-lg font-bold text-slate-900">Something went wrong</h1>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          This page hit an unexpected error. Your data is safe; try again, or go back to the dashboard.
        </p>
        {error.digest && <p className="text-[11px] font-mono text-slate-400 mb-4">Reference: {error.digest}</p>}
        <div className="flex justify-center gap-2">
          <button
            onClick={reset}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
