'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Shield, Code2, Server } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';

export default function DocsPage() {
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/api/v1/openapi.json')
      .then((data) => setSpec(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const methodsColor: Record<string, string> = {
    get: 'bg-blue-100 text-blue-700 border-blue-200',
    post: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    patch: 'bg-amber-100 text-amber-700 border-amber-200',
    delete: 'bg-rose-100 text-rose-700 border-rose-200',
    put: 'bg-purple-100 text-purple-700 border-purple-200',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <h1 className="text-base font-bold text-slate-900">API Documentation (OpenAPI 3.0)</h1>
            </div>
          </div>
          <a
            href="/api/v1/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg"
          >
            Raw JSON Spec
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">{spec?.info?.title || 'Fellow SaaS API'}</h2>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
            {spec?.info?.description}
          </p>
          <div className="flex items-center gap-4 mt-4 text-xs font-mono text-slate-500">
            <span>Version: {spec?.info?.version || '1.0.0'}</span>
            <span>•</span>
            <span>Prefix: /api/v1</span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading API specification...</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(spec?.paths || {}).map(([path, pathItem]: [string, any]) => (
              <div key={path} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between font-mono text-xs font-bold text-slate-800">
                  <span>{path}</span>
                </div>
                <div className="divide-y divide-slate-100 p-2">
                  {Object.entries(pathItem).map(([method, op]: [string, any]) => (
                    <div key={method} className="p-3 hover:bg-slate-50/50 rounded-xl transition-colors">
                      <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                              methodsColor[method.toLowerCase()] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {method}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{op.summary}</span>
                        </div>
                      </div>

                      {op.parameters && op.parameters.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                            Parameters
                          </span>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {op.parameters.map((p: any) => (
                              <span
                                key={p.name}
                                className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[11px]"
                              >
                                {p.name} ({p.in}) {p.required ? '*' : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

