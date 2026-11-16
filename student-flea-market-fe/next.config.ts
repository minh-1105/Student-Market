import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // Do not let `next dev` generate AGENTS.md / CLAUDE.md in this folder.
  agentRules: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
