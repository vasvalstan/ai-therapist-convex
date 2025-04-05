/** @type {import('next').NextConfig} */
import type { NextConfig } from 'next';
import createMDX from '@next/mdx';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "seo-heist.s3.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "dwdwn8b5ye.ufs.sh",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ansubkhan.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "utfs.io",
        port: "",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    reactCompiler: true,
  },
  // Ensure Clerk packages are treated as external packages
  // This prevents Edge Runtime compatibility warnings
  serverExternalPackages: ['@clerk/nextjs', '@clerk/shared'],
  pageExtensions: ["ts", "tsx", "mdx"],
  // Disable static generation for all pages
  output: 'standalone',
  // Make sure environment variables are available to server-side code
  env: {
    // Include Hume API variables to be accessible in API routes
    HUME_API_KEY: process.env.HUME_API_KEY,
    HUME_API_URL: process.env.HUME_API_URL || 'https://api.hume.ai',
    NEXT_PUBLIC_HUME_CONFIG_ID: process.env.NEXT_PUBLIC_HUME_CONFIG_ID,
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);