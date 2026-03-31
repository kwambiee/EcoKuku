/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ecokuku/db', '@ecokuku/ui'],
};

module.exports = nextConfig;
