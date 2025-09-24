/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['quill'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      }
    }
    return config
  },
  // Disable React strict mode if it's causing issues with Quill
  reactStrictMode: false,
  // Add domains for images if needed
  images: {
    domains: ['res.cloudinary.com', 'localhost'],
  },
}

module.exports = nextConfig
