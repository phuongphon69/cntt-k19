/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["googleapis", "bcryptjs"],
  },
};

export default nextConfig;
