import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-8 text-center">
        <p className="text-xs font-mono text-slate-400 mb-2">404</p>
        <h1 className="text-lg font-bold text-slate-900">Page not found</h1>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          The page does not exist, or you do not have access to it.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
