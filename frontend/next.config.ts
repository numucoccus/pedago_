import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pedago/shared"],
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
