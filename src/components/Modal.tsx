'use client';

import React, { useEffect, useId } from 'react';

const WIDTHS = { sm: 'max-w-sm', md: 'max-w-md' } as const;

interface ModalProps {
  title: string;
  onClose: () => void;
  size?: keyof typeof WIDTHS;
  children: React.ReactNode;
}

/** The dialog used by the app's forms: an overlay, a titled panel, and Escape to close. */
export function Modal({ title, onClose, size = 'md', children }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`bg-white rounded-2xl shadow-xl border border-slate-200 w-full ${WIDTHS[size]} p-6`}
      >
        <h3 id={titleId} className="text-base font-bold text-slate-900 mb-4">
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}

/** The Cancel / submit button row at the foot of a modal form. */
export function ModalActions({ onCancel, submitLabel, submitting = false }: { onCancel: () => void; submitLabel: string; submitting?: boolean }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </div>
  );
}
