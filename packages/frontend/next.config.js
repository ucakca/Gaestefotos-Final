/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@gaestefotos/shared'],
  distDir: process.env.NEXT_DIST_DIR || '.next',
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/favicon.svg',
      },
    ];
  },
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  // Allow cross-origin requests from Cloudflare domain
  allowedDevOrigins: [
    'app.xn--gstefotos-v2a.com',
    'app.gästefotos.com',
  ],
}

module.exports = nextConfig;

