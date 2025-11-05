/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Reduce bundle size for API routes
    serverComponentsExternalPackages: ['@solana/web3.js', '@coral-xyz/anchor'],
  },
  // Optimize serverless function size
  outputFileTracing: true,
}

export default nextConfig
