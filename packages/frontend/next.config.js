/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@gaestefotos/shared'],
  distDir: '.next',
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/favicon.svg',
      },
    ];
  },
  images: {
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
    'app.gästefotos.com',
  ],
}

module.exports = nextConfig;

