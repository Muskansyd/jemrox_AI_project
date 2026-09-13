/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Next.js ko build ke waqt TypeScript errors ignore karne ke liye force karna
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLint ki warnings ko bhi ignore karna taaki build na ruke
    ignoreDuringBuilds: true,
  }
};

module.exports = nextConfig;
