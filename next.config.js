/** @type {import('next').NextConfig} */
const nextConfig = {
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