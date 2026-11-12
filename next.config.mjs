import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV !== 'production';

// Next.js injects inline bootstrap scripts, so 'unsafe-inline' is required for scripts unless
// nonces are wired through every render; React Fast Refresh additionally needs 'unsafe-eval'.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  // Google Fonts serve the landing page's faces (public/landing.html).
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Self-contained server bundle for the Docker image (ignored by Vercel).
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['pg', 'bcryptjs'],
    instrumentationHook: true,
    // The OpenAPI route reads docs/openapi.yaml at runtime; make sure it ships with the bundle.
    outputFileTracingIncludes: {
      '/api/v1/openapi.json': ['./docs/openapi.yaml'],
    },
  },
  async rewrites() {
    return {
      // Signed-out visitors get the static landing page at "/"; with a session cookie, the
      // page route still redirects to the dashboard (or to /login when the session expired).
      beforeFiles: [
        { source: '/', missing: [{ type: 'cookie', key: 'fellow_session' }], destination: '/landing.html' },
      ],
    };
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
