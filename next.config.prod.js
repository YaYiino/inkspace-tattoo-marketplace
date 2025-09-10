const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  poweredByHeader: false,

  // Image optimization
  images: {
    domains: [
      'antsss.com',
      'cdn.antsss.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Security headers with Content Security Policy
  async headers() {
    const ContentSecurityPolicy = `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' 
        https://*.googletagmanager.com 
        https://*.google-analytics.com 
        https://*.mixpanel.com 
        https://js.sentry-cdn.com 
        https://browser.sentry-cdn.com;
      child-src 'none';
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' blob: data: 
        https://*.supabase.co 
        https://images.unsplash.com 
        https://cdn.antsss.com 
        https://*.googletagmanager.com;
      media-src 'self' https://*.supabase.co;
      connect-src 'self' 
        https://*.supabase.co 
        https://*.google-analytics.com 
        https://*.mixpanel.com 
        https://sentry.io 
        https://*.sentry.io 
        https://vitals.vercel-insights.com 
        wss://*.supabase.co;
      font-src 'self' https://fonts.gstatic.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim()

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ]
  },

  // URL rewrites
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/health',
          destination: '/api/health',
        },
      ],
    }
  },

  // Bundle optimization
  experimental: {
    optimizeCss: true,
    gzipSize: true,
  },

  // Output configuration for deployment
  output: 'standalone',
  
  // Environment variables that should be available at build time
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        sideEffects: false,
      }
    }

    // Bundle analyzer
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          analyzerPort: isServer ? 8888 : 8889,
          openAnalyzer: true,
        })
      )
    }

    return config
  },

  // Redirects for SEO
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ]
  },
}

// Sentry configuration for error tracking
const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  hideSourceMaps: true,
  disableLogger: true,
}

// Export the config with Sentry
module.exports = process.env.NODE_ENV === 'production'
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig