import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {},

  allowedDevOrigins: ["*.trycloudflare.com"],

  images: {
    domains: [],
  },

  devIndicators: false,
};

export default nextConfig;
