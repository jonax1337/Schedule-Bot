import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable caching to prevent old Google Sheets code from being cached
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
