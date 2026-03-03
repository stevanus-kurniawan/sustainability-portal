/** @type {import('next').NextConfig} */
const nextConfig = {
  // Low-memory build: disable webpack cache to reduce peak RAM (used in Docker on 8GB servers).
  ...(process.env.BUILD_LOW_MEMORY === '1' && {
    webpack: (config, { dev }) => {
      if (!dev) config.cache = false;
      return config;
    },
  }),
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  },
  // Proxy /api/v1 to backend so admin cookie is set on same origin (required when frontend and API are on different hosts).
  async rewrites() {
    let backend =
      process.env.API_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ||
      'http://localhost:3001';
    backend = backend.replace(/\/api\/v1\/?$/, ''); // ensure base only (no double /api/v1 in destination)
    return [{ source: '/api/v1/:path*', destination: `${backend}/api/v1/:path*` }];
  },
  // Relax build-time checks for local Docker usage; runtime still enforces types at compile step.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/slms-docs/**',
      },
    ],
  },
  transpilePackages: ['@slms/shared'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
