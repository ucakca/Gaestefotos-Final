/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@gaestefotos/shared'],
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
    'app.gaestefotos.com',
  ],
}

module.exports = nextConfig;

