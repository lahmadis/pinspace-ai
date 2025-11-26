import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // REFACTORED: Removed experimental.turbo section
  // - The experimental.turbo option is not documented in Next.js v16 official docs
  // - Turbopack aliases are not needed for standard builds
  // - Webpack configuration below handles canvas shimming for all build types

  // Webpack configuration for canvas shim
  // Documented: https://nextjs.org/docs/app/api-reference/next-config-js/webpack
  webpack: (config, { isServer }) => {
    // Alias canvas to shim for both server and client to prevent build errors
    // This is necessary because canvas is a Node.js module that doesn't work in the browser
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
