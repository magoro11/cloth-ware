import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: configDir,
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
