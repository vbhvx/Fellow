import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fellow | Secure Multi-Tenant Collaboration Platform',
  description: 'Enterprise-grade multi-tenant project and task collaboration platform with fine-grained authorization, real-time board sync, and audit history.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
        {children}
      </body>
    </html>
  );
}

