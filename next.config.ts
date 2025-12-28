import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_OPENROUTER_API_KEYS: process.env.NEXT_PUBLIC_OPENROUTER_API_KEYS,
    NEXT_PUBLIC_DEFAULT_AI_PROVIDER: process.env.NEXT_PUBLIC_DEFAULT_AI_PROVIDER,
    NEXT_PUBLIC_DEFAULT_AI_MODEL: process.env.NEXT_PUBLIC_DEFAULT_AI_MODEL,
  },
};

export default nextConfig;
