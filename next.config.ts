import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* outras opções de configuração */
  reactStrictMode: true,
  eslint: {
    // Isso permite que a build seja completada mesmo com erros de ESLint:
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
