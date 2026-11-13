'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { errorMessage } from '@/lib/api/client';
import { organizationsApi } from '@/lib/api/endpoints';

export default function NewOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const organization = await organizationsApi.create({ name: name.trim(), slug: slug.trim() || undefined });
      router.push(`/dashboard?org=${organization.id}`);
    } catch (err) {
      setError(errorMessage(err, 'Failed to create organization'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Workspace</span>
        </Link>

        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
          <Building2 className="w-6 h-6" />
        </div>

        <h1 className="text-xl font-black text-slate-900 tracking-tight">Create Organization</h1>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          Set up an isolated workspace for your company, team, or venture.
        </p>

        {error && (
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-rose-700 text-xs font-medium mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Organization Name</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Acme Corp"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                }
              }}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Workspace Slug (URL key)</label>
            <input
              type="text"
              placeholder="e.g. acme-corp"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Organization'}
          </button>
        </form>
      </div>
    </div>
  );
}

