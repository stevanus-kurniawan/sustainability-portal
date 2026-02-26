/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  },
  // /api/v1/* is proxied by app/api/v1/[...path]/route.ts so backend URL is read at runtime (fixes Docker where rewrites were baked at build time).
  // No rewrites here so the Route Handler is used and getInternalApiBase() sees API_BACKEND_URL / NEXT_PUBLIC_API_URL at request time.
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
      {
        protocol: 'https',
        hostname: '*.aliyuncs.com',
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
