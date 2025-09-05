import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* other configuration options */
  reactStrictMode: true,
  eslint: {
    // This allows the build to complete even with ESLint errors:
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
