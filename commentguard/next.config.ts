import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // postgres.js must not be bundled; it is loaded from node_modules at runtime.
  serverExternalPackages: ["postgres"],
  images: { unoptimized: true },
  // This app lives in a subfolder of a bigger repo; keep Next from looking above it.
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
};

export default nextConfig;
