/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['quill', 'pg', '@prisma/adapter-pg'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        dns: false,
        net: false,
        tls: false,
        pg: false,
        '@prisma/adapter-pg': false,
      }
    }
    // Suppress the pg-native optional dependency warning
    config.plugins.push(
      new (require('webpack').IgnorePlugin)({
        resourceRegExp: /^pg-native$/,
      })
    );
    return config
  },
  // Disable React strict mode if it's causing issues with Quill
  reactStrictMode: false,
  // Add domains for images if needed
  images: {
    domains: ['res.cloudinary.com', 'localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
    ],
  },
}

module.exports = nextConfig
