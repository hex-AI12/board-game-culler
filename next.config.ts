import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  eslint: {
    // ESLint runs separately; skip during build to avoid config version issues
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cf.geekdo-images.com",
      },
    ],
  },
}

export default nextConfig
