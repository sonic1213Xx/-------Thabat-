/** @type {import('next').NextConfig} */
const packageVersion = require('./package.json').version
const buildVersion = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || `${packageVersion}-${Date.now().toString(36)}`

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  generateBuildId: async () => buildVersion,
  env: {
    NEXT_PUBLIC_BUILD_VERSION: buildVersion,
  },
  experimental: {
    optimizePackageImports: ['@radix-ui', 'lucide-react'],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    }
    return config
  },
}

module.exports = nextConfig
