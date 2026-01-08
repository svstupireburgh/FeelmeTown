/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'http', hostname: 'res.cloudinary.com' },
    ],
  },
  reactStrictMode: true,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error', 'warn'] }
        : false,
  },
  eslint: {
    // Allow production builds to complete even if there are ESLint warnings
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
