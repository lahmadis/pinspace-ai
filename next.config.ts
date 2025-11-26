import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ESM support
  experimental: {
    turbo: {
      // Turbopack aliases
      resolveAlias: {
        canvas: "./src/shims/canvas.ts",
      },
    },
  },
  // Webpack aliases (for non-Turbopack builds)
  webpack: (config, { isServer }) => {
    // Alias canvas to shim for both server and client to prevent build errors
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: require.resolve("./src/shims/canvas.ts"),
    };
    
    // Also ignore canvas module in pdfjs-dist if it tries to import it
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    };
    
    return config;
  },
  // Optimize production builds
  compress: true,
  poweredByHeader: false,
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default nextConfig;
