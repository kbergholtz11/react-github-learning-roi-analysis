import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Enable React strict mode for catching potential issues
  reactStrictMode: true,
  
  // Optimize production builds
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
  },
  
  // Reduce bundle size by optimizing package imports
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "recharts",
      "date-fns",
      "framer-motion",
    ],
  },
  
  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Headers for caching static assets
  async headers() {
    return [
      {
        source: "/data/aggregated/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, stale-while-revalidate=600",
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
