const { withSentryConfig } = require('@sentry/nextjs');

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

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
      // Proxy API requests to backend
      {
        source: '/api/:path*',
        destination: 'http://localhost:8001/api/:path*',
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

// Sentry configuration (only applied if SENTRY_DSN is set)
const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  
  // Disable source maps upload (keep builds fast)
  disableServerWebpackPlugin: true,
  disableClientWebpackPlugin: true,
};

// Compose all wrappers
let finalConfig = nextConfig;

// Apply bundle analyzer
finalConfig = withBundleAnalyzer(finalConfig);

// Apply Sentry if configured
if (process.env.SENTRY_DSN) {
  finalConfig = withSentryConfig(finalConfig, sentryWebpackPluginOptions);
}

module.exports = finalConfig;

