import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    domains: ["pozitifklinik.com"],
  },
};

export default nextConfig;
