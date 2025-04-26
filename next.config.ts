import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  async rewrites() {
    return [
      {
        source: "/api/rpc",
        destination: "https://carrot.megaeth.com/rpc",
      },
    ];
  },
};

export default nextConfig;
