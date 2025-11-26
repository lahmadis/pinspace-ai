import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // REFACTORED: Removed all webpack configurations
  // - Webpack is no longer used in Next.js 16 (Turbopack is the default)
  // - All webpack-specific configs have been migrated to Turbopack equivalents

  // Turbopack configuration for canvas shim
  // This is necessary because react-pdf (via pdfjs-dist) tries to import the 'canvas' module
  // which is a Node.js-only module that doesn't work in the browser
  // The shim at ./src/shims/canvas.ts provides an empty export to prevent build errors
  experimental: {
    turbo: {
      resolveAlias: {
        canvas: "./src/shims/canvas.ts",
      },
    },
  },
  
  // Documented: https://nextjs.org/docs/app/api-reference/next-config-js/compress
  // Enable gzip compression for production builds
  compress: true,
  
  // Documented: https://nextjs.org/docs/app/api-reference/next-config-js/poweredByHeader
  // Remove X-Powered-By header for security
  poweredByHeader: false,
  
  // Documented: https://nextjs.org/docs/app/api-reference/next-config-js/reactStrictMode
  // Enable React strict mode for better development experience and error detection
  reactStrictMode: true,
  
  // Documented: https://nextjs.org/docs/app/api-reference/next-config-js/images
  // Configure image optimization settings
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default nextConfig;
