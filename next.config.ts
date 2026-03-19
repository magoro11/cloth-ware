import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  allowedDevOrigins: [
    // Next.js matches hostnames here (not full origin URLs with protocol/port).
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "192.168.0.102",
  ],
};

export default nextConfig;
