'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

/** The page-level error banner; dismissible when `onDismiss` is given. */
export function ErrorAlert({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div role="alert" className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-700 text-xs flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
        <span>{message}</span>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss" className="text-rose-500 hover:text-rose-700 font-bold">
          ✕
        </button>
      )}
    </div>
  );
}
