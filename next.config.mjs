/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["googleapis", "bcryptjs", "tesseract.js"],
  },
};

export default nextConfig;
