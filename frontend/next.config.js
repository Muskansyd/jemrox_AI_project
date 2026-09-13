/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Next.js ko static HTML export mode par force karna
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  }
};

module.exports = nextConfig;
