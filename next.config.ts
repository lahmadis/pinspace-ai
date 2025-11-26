import type { NextConfig } from "next";

/**
 * REFACTORED: Next.js 16+ configuration with Turbopack
 * 
 * Changes made to fix Turbopack build errors:
 * - ✅ Removed all webpack configurations (webpack is no longer used in Next.js 16)
 * - ✅ Removed all webpack(config) functions, plugins, and custom rules
 * - ✅ Added top-level turbopack configuration block
 * - ✅ Verified no next-* plugins in package.json that add webpack config
 * - ✅ Only using valid documented Next.js 16 options
 * 
 * Turbopack is the default bundler in Next.js 16, replacing webpack entirely.
 * This configuration uses only Turbopack and documented Next.js options.
 */
const nextConfig: NextConfig = {
  // REFACTORED: Turbopack configuration (top-level key in Next.js 16+)
  // Documented: https://nextjs.org/docs/app/api-reference/next-config-js/turbopack
  // 
  // In Next.js 16, Turbopack configurations moved from experimental.turbo to top-level turbopack key.
  // resolveAlias: Maps module names to alternative paths for module resolution.
  // 
  // This is necessary because react-pdf (via pdfjs-dist) tries to import the 'canvas' module
  // which is a Node.js-only module that doesn't work in the browser.
  // The shim at ./src/shims/canvas.ts provides an empty export to prevent build errors.
  turbopack: {
    resolveAlias: {
      canvas: "./src/shims/canvas.ts",
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
