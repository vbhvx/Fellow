import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number;
}

export function BrandLogo({ className = 'w-8 h-8', size = 64 }: BrandLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="fel-brand-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="fel-brand-border" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#1e293b" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="fel-brand-blue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id="fel-brand-purple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="45%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <filter id="fel-brand-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.65" />
        </filter>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#fel-brand-bg)" stroke="url(#fel-brand-border)" strokeWidth="1.2" />
      <rect x="14" y="21" width="22" height="26" rx="11" fill="none" stroke="url(#fel-brand-blue)" strokeWidth="6.5" />
      <rect x="28" y="17" width="22" height="26" rx="11" fill="none" stroke="url(#fel-brand-purple)" strokeWidth="6.5" filter="url(#fel-brand-shadow)" />
      <path d="M 28 21 C 32 21 36 24 36 28" fill="none" stroke="url(#fel-brand-blue)" strokeWidth="6.5" strokeLinecap="round" />
      <circle cx="32" cy="32" r="3.2" fill="#ffffff" />
      <circle cx="32" cy="32" r="5.5" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.6" />
    </svg>
  );
}

