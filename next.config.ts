import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
