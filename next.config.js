/** @type {import('next').NextConfig} */
const nextConfig = {
  // Temporarily skip TypeScript errors during build 
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Skip ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Image optimization for Supabase and other sources
  images: {
    domains: [
      'localhost',
      'tattoo-marketplace.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  
  // Enable compression
  compress: true,
  
  // Remove powered by header
  poweredByHeader: false,
}

module.exports = nextConfig